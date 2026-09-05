# Ticketing Platform

Three independent REST services, each owning its own in-memory data, behind one GraphQL gateway
that owns no data and composes by calling the services over HTTP. Attendee apps go through the
gateway; partners call the Orders service directly over REST `/v1`.

```
                 ┌──────────────┐  REST   ┌──────────────────────────────┐
Attendee apps ──►│   GraphQL    │────────►│ Catalog  :4001  events/venues │
   (Web/Mobile)  │   Gateway    │────────►│                /organizers    │
                 │   :4000      │────────►│ Inventory :4002 tiers/holds    │
                 │  (no data)   │────────►│ Orders    :4003 orders/tickets │
                 └──────────────┘         └──────────────────────────────┘
Partners ─────────────── REST /v1 ───────────────────────────►  Orders :4003
                                                Orders ── reserve ──► Inventory
```

## Stack

TypeScript (ESM) · Node ≥ 20 · Express · `graphql` + `graphql-http` · in-memory stores · no auth.
Run with `tsx`, test with Vitest + supertest. npm workspaces monorepo.

## Layout

```
packages/shared          envelope, errors, pagination, validators, event-bus, deterministic seed
services/catalog         :4001  read-only  (events, venues, organizers, tier catalog)
services/inventory       :4002  reserve + adjust (live availability, 10-min holds)
services/orders          :4003  list + create orders (calls Inventory), tickets projection
services/gateway         :4000  GraphQL — every field is a direct downstream REST call
docs/                    ADRs (Italian)
```

Each service follows minimal DDD: `domain/` · `application/` · `infrastructure/` · `interface/http/`
· `composition/`.

## Run

```bash
npm install
npm run dev:all      # boots all four (catalog:4001, inventory:4002, orders:4003, gateway:4000)
npm test             # Vitest suites, named by the design's test-case ids (CAT-/INV-/ORD-)
```

Seed volume defaults to the large, scenario-realistic set (~120 events, ~300 tiers, ~50k orders).
Override the order volume with `SEED_ORDERS=200`.

## Endpoints (exactly as designed — nothing added)

| Service | Method | Path |
| --- | --- | --- |
| Catalog | GET | `/api/v1/events/:id` |
| Catalog | GET | `/api/v1/events/:id/tiers` |
| Catalog | GET | `/api/v1/events?page&limit&city&date_range` |
| Catalog | GET | `/api/v1/venues/:venueId` |
| Catalog | GET | `/api/v1/organizers/:organizerId` |
| Inventory | POST | `/api/v1/reserves/:tierId` |
| Inventory | PATCH | `/api/v1/inventory/:tierId` |
| Orders | GET | `/api/v1/orders?page&limit` |
| Orders | POST | `/api/v1/orders` |
| Gateway | POST | `/graphql` — `event`, `events`, `reserveTickets` |

`date_range` format: `YYYY-MM-DD..YYYY-MM-DD` (inclusive). Prices are integer cents.

## Examples

```bash
curl localhost:4001/api/v1/events/evt_00001
curl "localhost:4001/api/v1/events?city=London&page=1&limit=20"
curl -X POST localhost:4002/api/v1/reserves/tier_00001 -H 'content-type: application/json' -d '{"quantity":2}'
curl "localhost:4003/api/v1/orders?page=1&limit=100"
curl -X POST localhost:4003/api/v1/orders -H 'content-type: application/json' \
     -d '{"tierId":"tier_00001","quantity":2,"buyerEmail":"a@b.com"}'

curl -X POST localhost:4000/graphql -H 'content-type: application/json' \
  -d '{"query":"{ event(id:\"evt_00001\"){ id title venue{name address} organizer{name} tiers{id name price quantity} } }"}'
```

Design decisions are recorded in `docs/ADR_*.md` (Italian).
