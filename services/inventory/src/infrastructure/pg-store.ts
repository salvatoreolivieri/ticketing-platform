import { and, eq, gte, lte, sql } from "drizzle-orm";
import { recordRead } from "@ticketing/shared";
import type { InventoryDb } from "./db/client";
import { availability, holds } from "./db/schema";
import type { Hold, InventoryStore, ReserveOutcome } from "./store";

/**
 * Postgres-backed availability + holds.
 *
 * `tryReserve` decrements in a single guarded UPDATE
 * (`... WHERE quantity_remaining >= $q RETURNING`), so two concurrent reserves
 * can never both succeed past the remaining count — the race the in-memory
 * store avoided only by being single-threaded.
 */
export class PostgresInventoryStore implements InventoryStore {
  constructor(private readonly db: InventoryDb) {}

  async releaseExpired(now: number): Promise<Hold[]> {
    const cutoff = new Date(now);
    return this.db.transaction(async (tx) => {
      const expired = await tx
        .delete(holds)
        .where(lte(holds.expiresAt, cutoff))
        .returning();
      if (expired.length === 0) return [];

      // Return each hold's seats to its tier, capped at the tier total.
      const byTier = new Map<string, number>();
      for (const h of expired)
        byTier.set(h.tierId, (byTier.get(h.tierId) ?? 0) + h.quantity);
      for (const [tierId, qty] of byTier) {
        await tx
          .update(availability)
          .set({
            quantityRemaining: sql`LEAST(${availability.quantityTotal}, ${availability.quantityRemaining} + ${qty})`,
          })
          .where(eq(availability.tierId, tierId));
      }

      return expired.map((h) => ({
        orderId: h.orderId,
        tierId: h.tierId,
        quantity: h.quantity,
        expiresAt: h.expiresAt.getTime(),
      }));
    });
  }

  async tryReserve(
    tierId: string,
    quantity: number,
    orderId: string,
    expiresAt: number,
  ): Promise<ReserveOutcome> {
    recordRead("get");
    return this.db.transaction(async (tx) => {
      const updated = await tx
        .update(availability)
        .set({
          quantityRemaining: sql`${availability.quantityRemaining} - ${quantity}`,
        })
        .where(
          and(
            eq(availability.tierId, tierId),
            gte(availability.quantityRemaining, quantity),
          ),
        )
        .returning({
          eventId: availability.eventId,
          remaining: availability.quantityRemaining,
        });

      if (updated[0]) {
        await tx
          .insert(holds)
          .values({ orderId, tierId, quantity, expiresAt: new Date(expiresAt) });
        return {
          kind: "ok",
          eventId: updated[0].eventId,
          remaining: updated[0].remaining,
        };
      }

      // No row updated: distinguish "unknown tier" from "not enough seats".
      const existing = await tx
        .select({ remaining: availability.quantityRemaining })
        .from(availability)
        .where(eq(availability.tierId, tierId));
      if (existing.length === 0) return { kind: "not_found" };
      return { kind: "insufficient", remaining: existing[0]!.remaining };
    });
  }

  async setAvailability(
    tierId: string,
    quantityTotal: number,
    quantityRemaining: number,
  ): Promise<boolean> {
    const updated = await this.db
      .update(availability)
      .set({ quantityTotal, quantityRemaining })
      .where(eq(availability.tierId, tierId))
      .returning({ tierId: availability.tierId });
    return updated.length > 0;
  }
}
