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

/** Owns live tier availability + the 10-minute holds. */
export class InMemoryInventoryStore {
  private readonly availability = new Map<string, Availability>();
  private holds: Hold[] = [];

  constructor(seed: Availability[]) {
    for (const a of seed) this.availability.set(a.tierId, { ...a });
  }

  get(tierId: string): Availability | undefined {
    return this.availability.get(tierId);
  }

  addHold(hold: Hold): void {
    this.holds.push(hold);
  }

  /** Releases expired holds back into quantityRemaining, calling onRelease for each. */
  releaseExpired(now: number, onRelease: (hold: Hold) => void): void {
    const kept: Hold[] = [];
    for (const hold of this.holds) {
      if (hold.expiresAt <= now) {
        const a = this.availability.get(hold.tierId);
        if (a) a.quantityRemaining = Math.min(a.quantityTotal, a.quantityRemaining + hold.quantity);
        onRelease(hold);
      } else {
        kept.push(hold);
      }
    }
    this.holds = kept;
  }
}
