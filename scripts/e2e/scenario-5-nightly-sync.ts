/**
 * Scenario 5 — Partner nightly sync.
 *
 * A venue's system runs at 3am and pulls every order (up to 50,000) via the
 * Orders REST API. The integration was written two years ago and untouched
 * since, so the contract must be stable: offset pagination, one envelope shape.
 *
 * Orders come back oldest-first, so the partner can keep a high-water mark and
 * pull only what's new "since the last sync".
 *
 *   Run: npm run e2e:5   (or: npx tsx scripts/e2e/scenario-5-nightly-sync.ts)
 */
import { ORDERS, check, finish, get, heading, info, mapPool, preflight } from "./lib";

heading(
  5,
  "Partner nightly sync",
  "Pull every order (up to 50k) over a stable v1 contract. Offset pagination; oldest-first ordering enables incremental 'since last sync'.",
);

if (await preflight([{ name: "orders", base: ORDERS }])) {
  const LIMIT = 100;

  const first = await get(`${ORDERS}/api/v1/orders?page=1&limit=${LIMIT}`);
  check("HTTP 200", first.status === 200, `status ${first.status}`);

  const env = first.body;
  check(
    "stable envelope: success + data[] + pagination",
    env?.success === true && Array.isArray(env?.data) && !!env?.pagination,
    JSON.stringify(env?.pagination),
  );

  const total: number = env?.pagination?.total ?? 0;
  const totalPages: number = env?.pagination?.totalPages ?? 0;
  check("totalPages == ceil(total / limit)", totalPages === Math.ceil(total / LIMIT), `total=${total}, pages=${totalPages}`);
  info(`Orders reports ${total.toLocaleString()} orders across ${totalPages} pages of ${LIMIT}.`);

  // Pull every page (bounded concurrency), then reassemble in page order.
  const start = Date.now();
  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = await mapPool(pageNums, 12, async (page) => {
    const r = await get(`${ORDERS}/api/v1/orders?page=${page}&limit=${LIMIT}`);
    return (r.body?.data ?? []) as any[];
  });
  const all = pages.flat();
  const ms = Date.now() - start;

  check("pulled every record (count == total)", all.length === total, `${all.length} of ${total}`);
  const ids = new Set(all.map((o) => o.id));
  check("no duplicates or gaps (unique ids == total)", ids.size === total, `${ids.size} unique`);

  let monotonic = true;
  for (let i = 1; i < all.length; i++) {
    if (all[i].createdAt < all[i - 1].createdAt) { monotonic = false; break; }
  }
  check("orders globally oldest-first (enables 'since last sync')", monotonic);

  if (all.length > 10) {
    const watermark = all[Math.floor(all.length / 2)].createdAt;
    const newer = all.filter((o) => o.createdAt > watermark).length;
    info(`Incremental pull: from watermark ${watermark}, the partner fetches ${newer.toLocaleString()} newer orders and stops.`);
  }
  info(`Full ${total.toLocaleString()}-record pull completed in ${ms} ms (12-way concurrency).`);
}

finish();
