/**
 * Drizzle schema for catalog_db — the read-only source of truth others derive
 * from. Mirrors the `*Record` shapes in @ticketing/shared, minus the
 * denormalized `EventRecord.tierIds[]` (reconstructed from `tiers.eventId`).
 *
 * Prices are integer cents. `startsAt` is timestamptz; ISO-8601 UTC strings
 * sort identically lexicographically and chronologically, so the browse
 * ordering (startsAt, id) is preserved by the index below.
 */
import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const organizers = pgTable("organizers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export const venues = pgTable("venues", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
});

export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    city: text("city").notNull(),
    venueId: text("venue_id")
      .notNull()
      .references(() => venues.id),
    organizerId: text("organizer_id")
      .notNull()
      .references(() => organizers.id),
  },
  (t) => ({
    // The browse list sorts by (startsAt, id) and can page from this index.
    startsAtIdx: index("events_starts_at_id_idx").on(t.startsAt, t.id),
    cityIdx: index("events_city_idx").on(t.city),
  }),
);

export const tiers = pgTable(
  "tiers",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id),
    name: text("name").notNull(),
    price: integer("price").notNull(), // integer cents
    quantityTotal: integer("quantity_total").notNull(),
    quantityRemaining: integer("quantity_remaining").notNull(),
  },
  (t) => ({
    // Batched tiers-by-event read (the N+1 fix) hits this index.
    eventIdx: index("tiers_event_id_idx").on(t.eventId),
  }),
);
