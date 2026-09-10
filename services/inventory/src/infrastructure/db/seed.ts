/**
 * Seeds inventory_db from the deterministic catalog's tiers — the same slice
 * the in-memory container derived availability from. Holds start empty.
 * Idempotent: skips when availability is already populated.
 *
 *   npm run db:seed -w services/inventory
 */
import { sql } from "drizzle-orm";
import { generateCatalog } from "@ticketing/shared";
import { createInventoryDb } from "./client";
import { availability } from "./schema";

async function main() {
  const { db, pool } = createInventoryDb();
  try {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(availability);
    if (count > 0) {
      console.log(
        `[inventory:seed] already seeded (${count} tiers) — skipping`,
      );
      return;
    }

    const { tiers } = generateCatalog();
    await db
      .insert(availability)
      .values(
        tiers.map((t) => ({
          tierId: t.id,
          eventId: t.eventId,
          quantityTotal: t.quantityTotal,
          quantityRemaining: t.quantityRemaining,
        })),
      )
      .onConflictDoNothing();

    console.log(`[inventory:seed] inserted ${tiers.length} availability rows`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[inventory:seed] failed:", err);
  process.exit(1);
});
