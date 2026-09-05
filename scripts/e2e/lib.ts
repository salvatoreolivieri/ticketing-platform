/**
 * Shared helpers for the black-box end-to-end scenario scripts.
 *
 * These talk to the *running* services over HTTP only (no imports from the app
 * code), so they exercise the system exactly as a real client would. Start the
 * stack first with `npm run dev:all`.
 */

export const GATEWAY = process.env.GATEWAY_URL ?? "http://localhost:4000";
export const CATALOG = process.env.CATALOG_URL ?? "http://localhost:4001";
export const INVENTORY = process.env.INVENTORY_URL ?? "http://localhost:4002";
export const ORDERS = process.env.ORDERS_URL ?? "http://localhost:4003";

const useColor = Boolean(process.stdout.isTTY);
const paint = (code: string, s: string) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
export const bold = (s: string) => paint("1", s);
export const dim = (s: string) => paint("2", s);
export const green = (s: string) => paint("32", s);
export const red = (s: string) => paint("31", s);
export const cyan = (s: string) => paint("36", s);

let checks = 0;
let failures = 0;

export function heading(n: number, title: string, description: string): void {
  console.log("");
  console.log(bold(cyan(`━━━ Scenario ${n}: ${title} ━━━`)));
  console.log(dim(description));
  console.log("");
}

export function info(msg: string): void {
  console.log(`  ${dim("•")} ${dim(msg)}`);
}

/** Records one assertion and prints a ✓/✗ line. Returns the condition. */
export function check(desc: string, cond: boolean, detail = ""): boolean {
  checks++;
  if (cond) {
    console.log(`  ${green("✓")} ${desc}${detail ? ` ${dim("— " + detail)}` : ""}`);
  } else {
    failures++;
    console.log(`  ${red("✗ " + desc)}${detail ? ` ${red("— " + detail)}` : ""}`);
  }
  return cond;
}

/** Prints the summary and sets the process exit code (0 = all passed). */
export function finish(): void {
  console.log("");
  const ok = failures === 0;
  const line = `${checks - failures}/${checks} checks passed`;
  console.log(ok ? green(bold(`PASS — ${line}`)) : red(bold(`FAIL — ${line}`)));
  process.exitCode = ok ? 0 : 1;
}

// ---- HTTP ------------------------------------------------------------------

export type Res = { status: number; body: any; bytes: number };

async function parse(res: Response): Promise<Res> {
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* non-JSON — keep the raw text */
  }
  return { status: res.status, body, bytes: Buffer.byteLength(text) };
}

export async function get(url: string): Promise<Res> {
  return parse(await fetch(url));
}

export async function post(url: string, body: unknown): Promise<Res> {
  return parse(
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export type GqlRes = { status: number; data: any; errors: any[]; bytes: number };

export async function gql(query: string, variables?: Record<string, unknown>): Promise<GqlRes> {
  const r = await post(`${GATEWAY}/graphql`, { query, variables });
  return { status: r.status, data: r.body?.data, errors: r.body?.errors ?? [], bytes: r.bytes };
}

// ---- Preflight -------------------------------------------------------------

async function isUp(base: string): Promise<boolean> {
  try {
    await fetch(base, { signal: AbortSignal.timeout(2000) });
    return true; // any HTTP response (even 404) means the server is reachable
  } catch {
    return false;
  }
}

/** Verifies every required service is reachable; prints guidance and returns false otherwise. */
export async function preflight(needs: { name: string; base: string }[]): Promise<boolean> {
  const down: string[] = [];
  for (const n of needs) if (!(await isUp(n.base))) down.push(`${n.name} (${n.base})`);
  if (down.length) {
    console.log(red(bold("Cannot run — these services are not reachable:")));
    for (const d of down) console.log(red(`  ✗ ${d}`));
    console.log(`\nStart the stack first:  ${bold("npm run dev:all")}`);
    process.exitCode = 1;
    return false;
  }
  return true;
}

// ---- Domain probes ---------------------------------------------------------

const pad = (n: number) => String(n).padStart(5, "0");

/**
 * Reads a tier's *live* seats-remaining from Inventory (the source of truth) by
 * attempting an impossible reservation and reading the count back off the 409.
 * The probe never consumes seats — the reserve is rejected before it decrements.
 */
export async function liveRemaining(tierId: string, base = INVENTORY): Promise<number> {
  const r = await post(`${base}/api/v1/reserves/${tierId}`, { quantity: 1_000_000_000 });
  if (r.status === 404) throw new Error(`tier ${tierId} not found in Inventory`);
  if (r.status === 409) {
    const m = /Only (\d+) seats remaining/.exec(r.body?.errors?.[0]?.message ?? "");
    if (m) return Number(m[1]);
  }
  throw new Error(`unexpected reserve probe for ${tierId}: ${r.status} ${JSON.stringify(r.body)}`);
}

/** First tier (scanning tier_00001…) with at least `min` live seats — Inventory only. */
export async function findInventoryTierWithSeats(
  min: number,
  scan = 120,
  base = INVENTORY,
): Promise<{ tierId: string; remaining: number }> {
  for (let i = 1; i <= scan; i++) {
    const tierId = `tier_${pad(i)}`;
    try {
      const remaining = await liveRemaining(tierId, base);
      if (remaining >= min) return { tierId, remaining };
    } catch {
      /* gap in the tier sequence — keep scanning */
    }
  }
  throw new Error(`no tier with >= ${min} live seats found in the first ${scan} tiers`);
}

/** First Catalog tier (scanning evt_00001…) whose cacheable copy has ≥ `min` seats. */
export async function findCatalogTierWithSeats(
  min: number,
  scan = 60,
): Promise<{ eventId: string; tierId: string; tierName: string; catalogRemaining: number }> {
  for (let i = 1; i <= scan; i++) {
    const eventId = `evt_${pad(i)}`;
    const r = await get(`${CATALOG}/api/v1/events/${eventId}`);
    if (r.status !== 200) continue;
    for (const t of r.body?.data?.tiers ?? []) {
      if (t.quantityRemaining >= min) {
        return { eventId, tierId: t.id, tierName: t.name, catalogRemaining: t.quantityRemaining };
      }
    }
  }
  throw new Error(`no Catalog tier with >= ${min} seats found in the first ${scan} events`);
}

/** Runs `fn` over `items` with bounded concurrency, preserving input order. */
export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    for (let i = next++; i < items.length; i = next++) out[i] = await fn(items[i]!, i);
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return out;
}
