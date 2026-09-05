import { EventBus, generateCatalog, generateOrders, priceSnapshot } from "@ticketing/shared";
import type { OrderRecord, TicketRecord } from "@ticketing/shared";
import { InMemoryOrdersStore } from "../infrastructure/in-memory-store";
import { HttpInventoryClient } from "../infrastructure/http-inventory-client";
import type { InventoryClient } from "../application/ports";

export type OrdersDeps = {
  store: InMemoryOrdersStore;
  bus: EventBus;
  inventory: InventoryClient;
  priceByTier: Map<string, number>;
};

export function buildOrders(inventoryBaseUrl: string): OrdersDeps {
  const catalog = generateCatalog();
  const seedCount = Number(process.env.SEED_ORDERS ?? 50000);
  const { orders, tickets } = generateOrders(catalog, seedCount);

  const store = new InMemoryOrdersStore(orders, tickets);
  const bus = new EventBus();
  const priceByTier = priceSnapshot(catalog);

  // Event-driven projection: OrderPlaced -> a Ticket exists.
  bus.on("OrderPlaced", (e) => {
    const ticket: TicketRecord = {
      id: `tkt_${String(e.orderId)}`,
      orderId: String(e.orderId),
      eventId: String(e.eventId),
      tierId: String(e.tierId),
      quantity: Number(e.quantity),
    };
    store.addTicket(ticket);
    console.log("[orders] OrderPlaced", e.orderId, "-> ticket", ticket.id);
  });

  const inventory = new HttpInventoryClient(inventoryBaseUrl);
  return { store, bus, inventory, priceByTier };
}

export type { OrderRecord };
