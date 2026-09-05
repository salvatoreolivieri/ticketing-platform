/**
 * Scenario 6 — Live availability.
 *
 * Seats remaining must NEVER be stale; event titles and venue addresses can be a
 * minute old without anyone caring.
 *
 * Per ADR-0004 the tier lives in two places: Inventory owns the live availability
 * (source of truth for reservations), while Catalog keeps a cache-friendly read
 * copy that the gateway serves and does NOT reconcile. This script shows that a
 * reservation moves the Inventory number instantly, while the Catalog copy — the
 * one that's allowed to lag — stays put.
 *
 *   Run: npm run e2e:6   (or: npx tsx scripts/e2e/scenario-6-live-availability.ts)
 */
import { CATALOG, INVENTORY, check, finish, findCatalogTierWithSeats, get, heading, info, liveRemaining, post, preflight } from "./lib";

heading(
  6,
  "Live availability",
  "Seats-remaining is never stale (Inventory = source of truth); titles/addresses may lag (Catalog = cacheable copy). ADR-0004.",
);

if (await preflight([
  { name: "catalog", base: CATALOG },
  { name: "inventory", base: INVENTORY },
])) {
  const { eventId, tierId, tierName, catalogRemaining: c0 } = await findCatalogTierWithSeats(3);
  const i0 = await liveRemaining(tierId);
  info(`Tier ${tierId} (${tierName}) on ${eventId}: Catalog copy=${c0}, Inventory live=${i0}.`);

  // Reserve through Inventory — the authoritative write path.
  const hold = await post(`${INVENTORY}/api/v1/reserves/${tierId}`, { quantity: 2 });
  check("reserve 2 via Inventory → HTTP 201", hold.status === 201, `status ${hold.status}`);

  // Live availability reflects the write immediately — never stale, no cache.
  const i1 = await liveRemaining(tierId);
  check("Inventory live seats-left updates instantly (i0 − 2)", i1 === i0 - 2, `${i0} → ${i1}`);

  // Catalog copy is intentionally NOT reconciled — it's the cacheable read model.
  const detail = await get(`${CATALOG}/api/v1/events/${eventId}`);
  const c1 = (detail.body?.data?.tiers ?? []).find((t: any) => t.id === tierId)?.quantityRemaining;
  check("Catalog copy is unchanged (cache-friendly, may lag a minute)", c1 === c0, `${c0} → ${c1}`);

  check(
    "the live number diverged from the cached copy by exactly the 2 held seats",
    c1 - i1 === c0 - i0 + 2,
    `catalog−live gap moved by 2`,
  );

  info("Takeaway: read live seats-remaining from Inventory (never cache it); titles/addresses from Catalog may be ~a minute old.");
}

finish();
