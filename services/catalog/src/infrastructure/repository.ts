import type {
  EventRecord,
  OrganizerRecord,
  TierRecord,
  VenueRecord,
} from "@ticketing/shared";

/**
 * The Catalog read model. Methods are async so the same interface backs both
 * the Postgres repository (used by the running service, see pg-repository.ts)
 * and the in-memory fake (used by tests).
 */
export interface CatalogRepository {
  getEvent(id: string): Promise<EventRecord | undefined>;
  getVenue(id: string): Promise<VenueRecord | undefined>;
  getOrganizer(id: string): Promise<OrganizerRecord | undefined>;
  /** Returns undefined when the event itself is unknown; [] when it has no tiers. */
  getTiersForEvent(eventId: string): Promise<TierRecord[] | undefined>;
  /**
   * Batch variant of getTiersForEvent — one read for many events, so list
   * endpoints don't fan out into N per-row reads. Unknown eventIds are simply
   * absent from the returned map (known events with no tiers map to []).
   */
  getTiersForEvents(eventIds: string[]): Promise<Map<string, TierRecord[]>>;
  allEvents(): Promise<EventRecord[]>;
}
