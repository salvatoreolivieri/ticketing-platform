/**
 * Catalog public response DTOs — the contract the design fixes. Catalog is a
 * read-only service, so there are no invariants here, only the shapes it serves.
 */

/** Full tier as returned by /events/:id and /events/:id/tiers. */
export type TierDto = {
  id: string;
  name: string;
  price: number;
  quantityTotal: number;
  quantityRemaining: number;
};

export type VenueDto = { id: string; name: string; address: string };

export type OrganizerDto = { id: string; name: string };

/**
 * Event detail. `venueId` / `organizerId` are additive (Approach A) so the
 * gateway can fan out to /venues/:venueId and /organizers/:organizerId; the
 * embedded `venue` / `organizer` / `tiers` stay exactly as the design specifies.
 */
export type EventDto = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  city: string;
  venueId: string;
  organizerId: string;
  venue: { name: string; address: string };
  organizer: { name: string };
  tiers: TierDto[];
};

/** One row of the browse list. */
export type EventListRowDto = {
  id: string;
  title: string;
  startsAt: string;
  tier: { price: number };
};
