import type {
  Catalog,
  EventRecord,
  OrganizerRecord,
  TierRecord,
  VenueRecord,
} from "@ticketing/shared";

export interface CatalogRepository {
  getEvent(id: string): EventRecord | undefined;
  getVenue(id: string): VenueRecord | undefined;
  getOrganizer(id: string): OrganizerRecord | undefined;
  /** Returns undefined when the event itself is unknown; [] when it has no tiers. */
  getTiersForEvent(eventId: string): TierRecord[] | undefined;
  allEvents(): EventRecord[];
}

export class InMemoryCatalogRepository implements CatalogRepository {
  private readonly events = new Map<string, EventRecord>();
  private readonly venues = new Map<string, VenueRecord>();
  private readonly organizers = new Map<string, OrganizerRecord>();
  private readonly tiersByEvent = new Map<string, TierRecord[]>();
  private readonly eventOrder: string[] = [];

  constructor(catalog: Catalog) {
    for (const o of catalog.organizers) this.organizers.set(o.id, o);
    for (const v of catalog.venues) this.venues.set(v.id, v);
    for (const t of catalog.tiers) {
      const list = this.tiersByEvent.get(t.eventId) ?? [];
      list.push(t);
      this.tiersByEvent.set(t.eventId, list);
    }
    for (const e of catalog.events) {
      this.events.set(e.id, e);
      this.eventOrder.push(e.id);
    }
  }

  getEvent(id: string): EventRecord | undefined {
    return this.events.get(id);
  }

  getVenue(id: string): VenueRecord | undefined {
    return this.venues.get(id);
  }

  getOrganizer(id: string): OrganizerRecord | undefined {
    return this.organizers.get(id);
  }

  getTiersForEvent(eventId: string): TierRecord[] | undefined {
    if (!this.events.has(eventId)) return undefined;
    return this.tiersByEvent.get(eventId) ?? [];
  }

  allEvents(): EventRecord[] {
    return this.eventOrder.map((id) => this.events.get(id)!);
  }
}
