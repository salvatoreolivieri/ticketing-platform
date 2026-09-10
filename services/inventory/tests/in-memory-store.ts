import { recordRead } from "@ticketing/shared";
import type {
  Availability,
  Hold,
  InventoryStore,
  ReserveOutcome,
} from "../src/infrastructure/store";

/**
 * In-memory InventoryStore — a test fake. The running service uses
 * PostgresInventoryStore; this exists only to keep the unit suite fast and
 * database-free.
 */
export class InMemoryInventoryStore implements InventoryStore {
  private readonly availability = new Map<string, Availability>();
  private holds: Hold[] = [];

  constructor(seed: Availability[]) {
    for (const a of seed) this.availability.set(a.tierId, { ...a });
  }

  async releaseExpired(now: number): Promise<Hold[]> {
    const kept: Hold[] = [];
    const released: Hold[] = [];
    for (const hold of this.holds) {
      if (hold.expiresAt <= now) {
        const a = this.availability.get(hold.tierId);
        if (a)
          a.quantityRemaining = Math.min(
            a.quantityTotal,
            a.quantityRemaining + hold.quantity,
          );
        released.push(hold);
      } else {
        kept.push(hold);
      }
    }
    this.holds = kept;
    return released;
  }

  async tryReserve(
    tierId: string,
    quantity: number,
    orderId: string,
    expiresAt: number,
  ): Promise<ReserveOutcome> {
    recordRead("get");
    const a = this.availability.get(tierId);
    if (!a) return { kind: "not_found" };
    if (quantity > a.quantityRemaining)
      return { kind: "insufficient", remaining: a.quantityRemaining };
    a.quantityRemaining -= quantity;
    this.holds.push({ orderId, tierId, quantity, expiresAt });
    return { kind: "ok", eventId: a.eventId, remaining: a.quantityRemaining };
  }

  async setAvailability(
    tierId: string,
    quantityTotal: number,
    quantityRemaining: number,
  ): Promise<boolean> {
    const a = this.availability.get(tierId);
    if (!a) return false;
    a.quantityTotal = quantityTotal;
    a.quantityRemaining = quantityRemaining;
    return true;
  }
}
