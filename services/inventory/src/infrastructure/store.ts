export type Availability = {
  tierId: string;
  eventId: string;
  quantityTotal: number;
  quantityRemaining: number;
};

export type Hold = {
  orderId: string;
  tierId: string;
  quantity: number;
  expiresAt: number; // epoch ms
};

/** Result of an atomic reserve attempt. */
export type ReserveOutcome =
  | { kind: "ok"; eventId: string; remaining: number }
  | { kind: "not_found" }
  | { kind: "insufficient"; remaining: number };

/**
 * Live tier availability + the 10-minute holds. Async so the same interface
 * backs the Postgres store (running service, see pg-store.ts) and the in-memory
 * fake (tests). `tryReserve` is a single atomic step (check-and-decrement +
 * hold) rather than a read then a write, so concurrent reserves can't oversell.
 */
export interface InventoryStore {
  /** Releases expired holds back into availability; returns the released holds. */
  releaseExpired(now: number): Promise<Hold[]>;
  /** Atomically reserves `quantity` and records a hold, or reports why it can't. */
  tryReserve(
    tierId: string,
    quantity: number,
    orderId: string,
    expiresAt: number,
  ): Promise<ReserveOutcome>;
  /** Overwrites a tier's totals. Returns false if the tier is unknown. */
  setAvailability(
    tierId: string,
    quantityTotal: number,
    quantityRemaining: number,
  ): Promise<boolean>;
}
