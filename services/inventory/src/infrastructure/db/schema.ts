/**
 * Drizzle schema for inventory_db — live tier availability and the 10-minute
 * holds. `holds.expiresAt` is timestamptz (the in-memory store used epoch ms);
 * the reclaim sweep filters on it via the index below.
 */
import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const availability = pgTable("availability", {
  tierId: text("tier_id").primaryKey(),
  eventId: text("event_id").notNull(),
  quantityTotal: integer("quantity_total").notNull(),
  quantityRemaining: integer("quantity_remaining").notNull(),
});

export const holds = pgTable(
  "holds",
  {
    orderId: text("order_id").primaryKey(),
    tierId: text("tier_id").notNull(),
    quantity: integer("quantity").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    // Reclaim of expired holds scans by expiry.
    expiresIdx: index("holds_expires_at_idx").on(t.expiresAt),
    tierIdx: index("holds_tier_id_idx").on(t.tierId),
  }),
);
