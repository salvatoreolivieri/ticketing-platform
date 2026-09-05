import { EventBus, generateCatalog } from "@ticketing/shared";
import { InMemoryInventoryStore } from "../infrastructure/in-memory-store";

export type InventoryDeps = {
  store: InMemoryInventoryStore;
  bus: EventBus;
  /** Hold lifetime before lazy release. Omitted → reserve-tickets' 10-min default. */
  holdTtlMs?: number;
};

/** Seeds live availability from the deterministic catalog's tiers. */
export function buildInventory(holdTtlMs?: number): InventoryDeps {
  const { tiers } = generateCatalog();
  const store = new InMemoryInventoryStore(
    tiers.map((t) => ({
      tierId: t.id,
      eventId: t.eventId,
      quantityTotal: t.quantityTotal,
      quantityRemaining: t.quantityRemaining,
    })),
  );

  const bus = new EventBus();
  bus.on("SeatsReserved", (e) =>
    console.log("[inventory] SeatsReserved", e.orderId, e.tierId, e.quantity),
  );
  bus.on("SeatsReleased", (e) => console.log("[inventory] SeatsReleased", e.orderId, e.tierId));
  bus.on("InventoryAdjusted", (e) => console.log("[inventory] InventoryAdjusted", e.tierId));

  return { store, bus, holdTtlMs };
}
