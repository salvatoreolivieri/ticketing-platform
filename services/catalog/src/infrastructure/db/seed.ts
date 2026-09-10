/**
 * Seeds catalog_db from the deterministic generator. Idempotent: skips if the
 * events table is already populated, and inserts are `onConflictDoNothing` so a
 * partial run can be safely re-run. Insert order respects the FKs
 * (organizers, venues → events → tiers).
 *
 *   npm run db:seed -w services/catalog
 */
import { sql } from "drizzle-orm";
import { generateCatalog } from "@ticketing/shared";
import { createCatalogDb } from "./client";
import { events, organizers, tiers, venues } from "./schema";

async function main() {
  const { db, pool } = createCatalogDb();
  try {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(events);
    if (count > 0) {
      console.log(`[catalog:seed] already seeded (${count} events) — skipping`);
      return;
    }

    const catalog = generateCatalog();

    await db.insert(organizers).values(catalog.organizers).onConflictDoNothing();
    await db.insert(venues).values(catalog.venues).onConflictDoNothing();
    await db
      .insert(events)
      .values(
        catalog.events.map((e) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          startsAt: new Date(e.startsAt),
          city: e.city,
          venueId: e.venueId,
          organizerId: e.organizerId,
        })),
      )
      .onConflictDoNothing();
    await db.insert(tiers).values(catalog.tiers).onConflictDoNothing();

    console.log(
      `[catalog:seed] inserted ${catalog.organizers.length} organizers, ` +
        `${catalog.venues.length} venues, ${catalog.events.length} events, ` +
        `${catalog.tiers.length} tiers`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[catalog:seed] failed:", err);
  process.exit(1);
});
