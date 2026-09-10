import { eq, inArray } from "drizzle-orm";
import { recordRead } from "@ticketing/shared";
import type {
  EventRecord,
  OrganizerRecord,
  TierRecord,
  VenueRecord,
} from "@ticketing/shared";
import type { CatalogDb } from "./db/client";
import { events, organizers, tiers, venues } from "./db/schema";
import type { CatalogRepository } from "./repository";

type EventRow = typeof events.$inferSelect;
type TierRow = typeof tiers.$inferSelect;

/**
 * `tierIds` on EventRecord is denormalized and unused by the query layer (tiers
 * are fetched on demand via getTiersForEvent), so it maps to []. `startsAt` is
 * stored as timestamptz and mapped back to the ISO string the DTOs expect.
 */
function toEventRecord(row: EventRow): EventRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startsAt: row.startsAt.toISOString(),
    city: row.city,
    venueId: row.venueId,
    organizerId: row.organizerId,
    tierIds: [],
  };
}

function toTierRecord(row: TierRow): TierRecord {
  return {
    id: row.id,
    eventId: row.eventId,
    name: row.name,
    price: row.price,
    quantityTotal: row.quantityTotal,
    quantityRemaining: row.quantityRemaining,
  };
}

/** Postgres-backed Catalog read model. Filtering/sorting/pagination of the
 *  browse list stays in the query layer (parity with the original in-memory
 *  path); pushing it into SQL is a later optimization. */
export class PostgresCatalogRepository implements CatalogRepository {
  constructor(private readonly db: CatalogDb) {}

  async getEvent(id: string): Promise<EventRecord | undefined> {
    recordRead("getEvent");
    const rows = await this.db.select().from(events).where(eq(events.id, id));
    return rows[0] ? toEventRecord(rows[0]) : undefined;
  }

  async getVenue(id: string): Promise<VenueRecord | undefined> {
    recordRead("getVenue");
    const rows = await this.db.select().from(venues).where(eq(venues.id, id));
    return rows[0];
  }

  async getOrganizer(id: string): Promise<OrganizerRecord | undefined> {
    recordRead("getOrganizer");
    const rows = await this.db
      .select()
      .from(organizers)
      .where(eq(organizers.id, id));
    return rows[0];
  }

  async getTiersForEvent(eventId: string): Promise<TierRecord[] | undefined> {
    recordRead("getTiersForEvent");
    const known = await this.db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, eventId));
    if (known.length === 0) return undefined;
    const rows = await this.db
      .select()
      .from(tiers)
      .where(eq(tiers.eventId, eventId));
    return rows.map(toTierRecord);
  }

  async getTiersForEvents(
    eventIds: string[],
  ): Promise<Map<string, TierRecord[]>> {
    recordRead("getTiersForEvents");
    const out = new Map<string, TierRecord[]>();
    if (eventIds.length === 0) return out;

    const known = await this.db
      .select({ id: events.id })
      .from(events)
      .where(inArray(events.id, eventIds));
    for (const e of known) out.set(e.id, []);

    const rows = await this.db
      .select()
      .from(tiers)
      .where(inArray(tiers.eventId, eventIds));
    for (const t of rows) out.get(t.eventId)?.push(toTierRecord(t));

    return out;
  }

  async allEvents(): Promise<EventRecord[]> {
    recordRead("allEvents");
    const rows = await this.db.select().from(events);
    return rows.map(toEventRecord);
  }
}
