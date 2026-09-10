/**
 * Drizzle schema for orders_db. Owns orders + the tickets projection, plus a
 * `tier_prices` snapshot that replaces the in-memory `priceByTier` map — Orders
 * keeps its own copy of tier prices rather than reading Catalog's database,
 * preserving shared-nothing ownership.
 */
import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").notNull(),
    tierId: text("tier_id").notNull(),
    quantity: integer("quantity").notNull(),
    totalCents: integer("total_cents").notNull(),
    buyerEmail: text("buyer_email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    createdIdx: index("orders_created_at_idx").on(t.createdAt),
  }),
);

export const tickets = pgTable(
  "tickets",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull(),
    eventId: text("event_id").notNull(),
    tierId: text("tier_id").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (t) => ({
    orderIdx: index("tickets_order_id_idx").on(t.orderId),
  }),
);

/** tierId → unit price in cents. Seeded from the deterministic catalog. */
export const tierPrices = pgTable("tier_prices", {
  tierId: text("tier_id").primaryKey(),
  price: integer("price").notNull(),
});
