import { recordRead } from "@ticketing/shared";
import type {
  Catalog,
  EventRecord,
  OrganizerRecord,
  TierRecord,
  VenueRecord,
} from "@ticketing/shared";
import type { CatalogRepository } from "../src/infrastructure/repository";

/**
 * In-memory CatalogRepository — a test fake. The running service uses
 * PostgresCatalogRepository; this exists only to keep the unit suite fast and
 * database-free.
 */
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

  async getEvent(id: string): Promise<EventRecord | undefined> {
    recordRead("getEvent");
    return this.events.get(id);
  }

  async getVenue(id: string): Promise<VenueRecord | undefined> {
    recordRead("getVenue");
    return this.venues.get(id);
  }

  async getOrganizer(id: string): Promise<OrganizerRecord | undefined> {
    recordRead("getOrganizer");
    return this.organizers.get(id);
  }

  async getTiersForEvent(eventId: string): Promise<TierRecord[] | undefined> {
    recordRead("getTiersForEvent");
    if (!this.events.has(eventId)) return undefined;
    return this.tiersByEvent.get(eventId) ?? [];
  }

  async getTiersForEvents(eventIds: string[]): Promise<Map<string, TierRecord[]>> {
    recordRead("getTiersForEvents");
    const out = new Map<string, TierRecord[]>();
    for (const id of eventIds) {
      if (this.events.has(id)) out.set(id, this.tiersByEvent.get(id) ?? []);
    }
    return out;
  }

  async allEvents(): Promise<EventRecord[]> {
    recordRead("allEvents");
    return this.eventOrder.map((id) => this.events.get(id)!);
  }
}
