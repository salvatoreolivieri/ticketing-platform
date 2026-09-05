# ADR 0005 — GraphQL Gateway Composition

## Status

Accepted.

## Context

The gateway does not possess data: it resolves each field with a direct call to the relevant service.
The event detail query design indicates **4 calls**, but the `EventResponse`
already encapsulates `venue`, `organizer`, and `tiers`.

## Decision

- **`event(id)` → 4 REST calls (Approach A):**

1. `GET /api/v1/events/:id` (Catalog)
2. `GET /api/v1/venues/:venueId` (Catalog)
3. `GET /api/v1/organizers/:organizerId` (Catalog)
4. `GET /api/v1/events/:id/tiers` (Catalog)

To enable calls 2 and 3, `GET /events/:id` additively exposes `venueId`
and `organizerId` (nested `venue{name,address}` / `organizer{name}` / `tiers[]`
objects remain unchanged). `Tier.quantity` in GraphQL = `quantityRemaining` (seats remaining).

- **`events(page, limit, city, dateRange)` → 1 call** to `GET /api/v1/events`.
- **`reserveTickets(tierId, quantity)` → 1 call** to `POST /api/v1/reserves/:tierId`; mapping
  `reservationId ← orderId`, `tierId`/`quantity` from the arguments. 404/409/5xx become errors
  GraphQL.

## Consequences

Resolution is per-field and ready for a future service split. Cost: 3 additional round trips (to the
same Catalog service) for the detail screen. Alternative discarded (1-call dialing)
documented in the plan.
