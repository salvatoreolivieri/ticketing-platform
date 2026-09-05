# End-to-end scenario scripts

Black-box e2e tests — one runnable script per product scenario. They talk to the
**running** services over HTTP only (no imports from the app code), so they
exercise the system exactly as a real client would.

## Prerequisites

Start the whole stack first (Catalog :4001, Inventory :4002, Orders :4003,
Gateway :4000, Docs :4004):

```bash
npm run dev:all
```

Each script preflights the services it needs and tells you if something is down.

## Run

```bash
npm run e2e        # all six, in order, with an aggregate summary
npm run e2e:1      # Scenario 1 — Event detail screen         (Gateway + Catalog)
npm run e2e:2      # Scenario 2 — Mobile browse list          (Gateway + Catalog)
npm run e2e:3      # Scenario 3 — Attendee holds tickets       (Inventory)
npm run e2e:4      # Scenario 4 — Release ticket (hold expiry) (self-contained)
npm run e2e:5      # Scenario 5 — Partner nightly sync         (Orders)
npm run e2e:6      # Scenario 6 — Live availability            (Catalog + Inventory)
```

Or directly: `npx tsx scripts/e2e/scenario-1-event-detail.ts`.

Exit code is `0` when every check passes, `1` otherwise — so `npm run e2e` works
in CI.

## What each script proves

| # | Scenario | Key assertions |
|---|----------|----------------|
| 1 | Event detail | One gateway request returns title, description, start, venue name + **full address**, organizer, and every tier with price & seats-left. |
| 2 | Mobile browse | Rows carry **only** title/startsAt/lowestTierPrice(/id); `limit` caps the page; a browse row is far smaller than a full event detail. |
| 3 | Hold tickets | Reserve → 201 holds seats; over-reserve → **409 telling the exact remaining**; 404/400 edges. |
| 4 | Release ticket | After the hold's TTL lapses, the seats are **released** back into availability (lazy release), restoring the original count. |
| 5 | Nightly sync | Stable envelope; pull **all** (up to 50k) via offset pages; no dupes/gaps; oldest-first ordering enables a "since last sync" watermark. |
| 6 | Live availability | A reserve moves the **Inventory** number instantly (never stale); the **Catalog** cache copy is intentionally left to lag (ADR-0004). |

## Notes

- Scenarios 3 and 6 **reserve real seats**, mutating the in-memory Inventory of
  the running server. State resets on restart; the scripts pick a tier with
  enough seats each run, so they stay green across repeats until a tier is
  genuinely exhausted.
- **Scenario 4 is self-contained**: it spawns its own throwaway Inventory (on
  `:4102`, `HOLD_TTL_MS=1000ms`) so it can observe hold expiry in ~1s without a
  10-minute wait and without disturbing the shared stack's 10-minute holds. It
  kills that instance on exit. Tune with `E2E_RELEASE_PORT` / `E2E_RELEASE_TTL_MS`.
  (This relies on Inventory honoring the `HOLD_TTL_MS` env var — see
  `services/inventory/src/config.ts`.)
- Base URLs are overridable via `GATEWAY_URL`, `CATALOG_URL`, `INVENTORY_URL`,
  `ORDERS_URL`. Scenario 1/2 also honor `E2E_EVENT_ID`, `E2E_CITY`,
  `E2E_DATE_RANGE`.
- Scenario 5 adapts to `SEED_ORDERS` automatically (it reads `total` from the
  API), so `SEED_ORDERS=200 npm run start:orders` makes it finish instantly.
