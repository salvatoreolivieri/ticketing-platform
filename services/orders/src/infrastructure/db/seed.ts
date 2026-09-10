/**
 * Seeds orders_db from the deterministic generator: the tier-price snapshot
 * plus ~50k orders and their ticket projection (override with SEED_ORDERS).
 * Idempotent: skips when orders is already populated. Rows are chunked to stay
 * well under Postgres' 65535 bind-parameter limit.
 *
 *   npm run db:seed -w services/orders
 *   SEED_ORDERS=2000 npm run db:seed -w services/orders
 */
import { sql } from "drizzle-orm";
import { generateCatalog, generateOrders, priceSnapshot } from "@ticketing/shared";
import { createOrdersDb } from "./client";
import { orders, tickets, tierPrices } from "./schema";

const CHUNK = 1000;

async function insertChunked<T>(
  insertFn: (rows: T[]) => Promise<unknown>,
  rows: T[],
): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    await insertFn(rows.slice(i, i + CHUNK));
  }
}

async function main() {
  const { db, pool } = createOrdersDb();
  try {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders);
    if (count > 0) {
      console.log(`[orders:seed] already seeded (${count} orders) — skipping`);
      return;
    }

    const catalog = generateCatalog();
    const seedCount = Number(process.env.SEED_ORDERS ?? 50000);
    const { orders: orderRows, tickets: ticketRows } = generateOrders(
      catalog,
      seedCount,
    );

    const prices = [...priceSnapshot(catalog).entries()].map(
      ([tierId, price]) => ({ tierId, price }),
    );
    await insertChunked(
      (rows) => db.insert(tierPrices).values(rows).onConflictDoNothing(),
      prices,
    );

    await insertChunked(
      (rows) =>
        db
          .insert(orders)
          .values(
            rows.map((o) => ({ ...o, createdAt: new Date(o.createdAt) })),
          )
          .onConflictDoNothing(),
      orderRows,
    );

    await insertChunked(
      (rows) => db.insert(tickets).values(rows).onConflictDoNothing(),
      ticketRows,
    );

    console.log(
      `[orders:seed] inserted ${prices.length} tier prices, ` +
        `${orderRows.length} orders, ${ticketRows.length} tickets`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[orders:seed] failed:", err);
  process.exit(1);
});
