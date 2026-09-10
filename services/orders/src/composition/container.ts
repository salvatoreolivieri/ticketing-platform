import { EventBus } from "@ticketing/shared";
import type { OrderRecord, TicketRecord } from "@ticketing/shared";
import { createOrdersDb } from "../infrastructure/db/client";
import { tierPrices } from "../infrastructure/db/schema";
import { PostgresOrdersStore } from "../infrastructure/pg-orders-store";
import { HttpInventoryClient } from "../infrastructure/http-inventory-client";
import type { OrdersStore } from "../infrastructure/store";
import type { InventoryClient } from "../application/ports";

export type OrdersDeps = {
  store: OrdersStore;
  bus: EventBus;
  inventory: InventoryClient;
  priceByTier: Map<string, number>;
};

export async function buildOrders(inventoryBaseUrl: string): Promise<OrdersDeps> {
  const { db } = createOrdersDb();
  const store = new PostgresOrdersStore(db);

  // Tier prices are static reference data — load the snapshot once at startup.
  const priceRows = await db.select().from(tierPrices);
  const priceByTier = new Map(priceRows.map((r) => [r.tierId, r.price] as const));

  const bus = new EventBus();

  // Event-driven projection: OrderPlaced -> a Ticket row exists.
  bus.on("OrderPlaced", async (e) => {
    const ticket: TicketRecord = {
      id: `tkt_${String(e.orderId)}`,
      orderId: String(e.orderId),
      eventId: String(e.eventId),
      tierId: String(e.tierId),
      quantity: Number(e.quantity),
    };
    await store.addTicket(ticket);
    console.log("[orders] OrderPlaced", e.orderId, "-> ticket", ticket.id);
  });

  const inventory = new HttpInventoryClient(inventoryBaseUrl);
  return { store, bus, inventory, priceByTier };
}

export type { OrderRecord };
