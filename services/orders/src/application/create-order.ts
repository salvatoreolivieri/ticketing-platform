import {
  AppError,
  ConflictError,
  NotFoundError,
  requirePositiveInt,
  requireString,
} from "@ticketing/shared";
import type { EventBus, OrderRecord } from "@ticketing/shared";
import type { InMemoryOrdersStore } from "../infrastructure/in-memory-store";
import type { InventoryClient } from "./ports";

export type CreateOrderDeps = {
  store: InMemoryOrdersStore;
  bus: EventBus;
  inventory: InventoryClient;
  priceByTier: Map<string, number>;
  now?: () => Date;
};

/**
 * Places an order by reserving in Inventory first, then persisting. Inventory's
 * outcome is propagated verbatim: 404 -> 404, 409 -> 409, anything non-201 -> 500.
 * No order is created unless the reservation succeeded.
 */
export async function createOrder(
  deps: CreateOrderDeps,
  body: Record<string, unknown>,
): Promise<OrderRecord> {
  const tierId = requireString(body.tierId, "tierId");
  const quantity = requirePositiveInt(body.quantity, "quantity");
  const buyerEmail = requireString(body.buyerEmail, "buyerEmail");

  const reservation = await deps.inventory.reserve(tierId, quantity);
  if (reservation.status === 404) throw new NotFoundError(`Tier ${tierId} not found`);
  if (reservation.status === 409) throw new ConflictError("Insufficient inventory", "quantity");
  if (reservation.status !== 201 || !reservation.data) {
    throw new AppError(500, "INVENTORY_UNAVAILABLE", "Inventory service unavailable");
  }

  const { orderId, eventId } = reservation.data;
  const unitPriceCents = deps.priceByTier.get(tierId) ?? 0;
  const createdAt = (deps.now ?? (() => new Date()))().toISOString();

  const order: OrderRecord = {
    id: orderId,
    eventId,
    tierId,
    quantity,
    totalCents: unitPriceCents * quantity,
    buyerEmail,
    createdAt,
  };

  deps.store.add(order);
  deps.bus.publish({
    type: "OrderPlaced",
    orderId,
    eventId,
    tierId,
    quantity,
    totalCents: order.totalCents,
    buyerEmail,
  });

  return order;
}
