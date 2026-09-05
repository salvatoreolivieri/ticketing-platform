/**
 * Scenario 3 — Attendee holds tickets.
 *
 * Pick a tier and a quantity; the system reserves those seats for 10 minutes.
 * If not enough seats remain, the hold fails AND the attendee is told how many
 * are actually left.
 *
 * Inventory is the source of truth for availability, so this drives its REST API
 * directly (POST /reserves/:tierId), which surfaces the exact remaining count.
 *
 *   Run: npm run e2e:3   (or: npx tsx scripts/e2e/scenario-3-hold-tickets.ts)
 */
import { INVENTORY, check, finish, findInventoryTierWithSeats, heading, info, liveRemaining, post, preflight } from "./lib";

heading(
  3,
  "Attendee holds tickets",
  "Reserve N seats for 10 minutes. If too few remain, the hold fails and the attendee is told how many are actually left.",
);

if (await preflight([{ name: "inventory", base: INVENTORY }])) {
  const { tierId, remaining: r0 } = await findInventoryTierWithSeats(4);
  info(`Using ${tierId} — ${r0} seats live in Inventory.`);

  // Happy path: hold 2 seats.
  const hold = await post(`${INVENTORY}/api/v1/reserves/${tierId}`, { quantity: 2 });
  check("reserve 2 seats → HTTP 201", hold.status === 201, `status ${hold.status}`);
  check("returns a reservation (order) id", typeof hold.body?.data?.orderId === "string", hold.body?.data?.orderId);

  // The hold actually removed seats and keeps holding them (not released in-window).
  const r1 = await liveRemaining(tierId);
  check("seats-left dropped by exactly 2 (seats are held)", r1 === r0 - 2, `${r0} → ${r1}`);

  // Over-reserve: must fail AND report the true remaining.
  const over = await post(`${INVENTORY}/api/v1/reserves/${tierId}`, { quantity: r1 + 1000 });
  check("over-reserve → HTTP 409 conflict", over.status === 409, `status ${over.status}`);
  const msg: string = over.body?.errors?.[0]?.message ?? "";
  const told = Number(/Only (\d+) seats remaining/.exec(msg)?.[1] ?? NaN);
  check("attendee is told how many are actually left", told === r1, `message: "${msg}"`);

  // Contract edges.
  const notFound = await post(`${INVENTORY}/api/v1/reserves/tier_99999`, { quantity: 1 });
  check("unknown tier → HTTP 404", notFound.status === 404, `status ${notFound.status}`);
  const bad = await post(`${INVENTORY}/api/v1/reserves/${tierId}`, { quantity: 0 });
  check("quantity 0 → HTTP 400 validation", bad.status === 400, `status ${bad.status}`);

  info("Holds live for 10 minutes (design) and are released lazily on expiry — not awaited here.");
}

finish();
