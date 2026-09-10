import { EventBus } from "@ticketing/shared";
import { createInventoryDb } from "../infrastructure/db/client";
import { PostgresInventoryStore } from "../infrastructure/pg-store";
import type { InventoryStore } from "../infrastructure/store";

export type InventoryDeps = {
  store: InventoryStore;
  bus: EventBus;
  /** Hold lifetime before lazy release. Omitted → reserve-tickets' 10-min default. */
  holdTtlMs?: number;
};

/** Wires the Inventory store to inventory_db (availability + holds live there). */
export function buildInventory(holdTtlMs?: number): InventoryDeps {
  const { db } = createInventoryDb();
  const store = new PostgresInventoryStore(db);

  const bus = new EventBus();
  bus.on("SeatsReserved", (e) =>
    console.log("[inventory] SeatsReserved", e.orderId, e.tierId, e.quantity),
  );
  bus.on("SeatsReleased", (e) => console.log("[inventory] SeatsReleased", e.orderId, e.tierId));
  bus.on("InventoryAdjusted", (e) => console.log("[inventory] InventoryAdjusted", e.tierId));

  return { store, bus, holdTtlMs };
}
