import { recordRead } from "@ticketing/shared";
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
  /**
   * Batch variant of getTiersForEvent — one read for many events, so list
   * endpoints don't fan out into N per-row reads. Unknown eventIds are simply
   * absent from the returned map (known events with no tiers map to []).
   */
  getTiersForEvents(eventIds: string[]): Map<string, TierRecord[]>;
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
    recordRead("getEvent");
    return this.events.get(id);
  }

  getVenue(id: string): VenueRecord | undefined {
    recordRead("getVenue");
    return this.venues.get(id);
  }

  getOrganizer(id: string): OrganizerRecord | undefined {
    recordRead("getOrganizer");
    return this.organizers.get(id);
  }

  getTiersForEvent(eventId: string): TierRecord[] | undefined {
    recordRead("getTiersForEvent");
    if (!this.events.has(eventId)) return undefined;
    return this.tiersByEvent.get(eventId) ?? [];
  }

  getTiersForEvents(eventIds: string[]): Map<string, TierRecord[]> {
    recordRead("getTiersForEvents");
    const out = new Map<string, TierRecord[]>();
    for (const id of eventIds) {
      if (this.events.has(id)) out.set(id, this.tiersByEvent.get(id) ?? []);
    }
    return out;
  }

  allEvents(): EventRecord[] {
    recordRead("allEvents");
    return this.eventOrder.map((id) => this.events.get(id)!);
  }
}
