import { randomUUID } from "node:crypto";
import { ConflictError, NotFoundError, requirePositiveInt } from "@ticketing/shared";
import type { EventBus } from "@ticketing/shared";
import type { InMemoryInventoryStore } from "../infrastructure/in-memory-store";

const HOLD_TTL_MS = 10 * 60 * 1000; // Scenario 3: seats held for 10 minutes.

export type ReserveDeps = {
  store: InMemoryInventoryStore;
  bus: EventBus;
  now?: () => number;
  holdTtlMs?: number;
};

export type ReservationResult = { orderId: string; eventId: string };

export function reserveTickets(
  deps: ReserveDeps,
  tierId: string,
  quantityRaw: unknown,
): ReservationResult {
  const quantity = requirePositiveInt(quantityRaw, "quantity");
  const now = (deps.now ?? Date.now)();

  deps.store.releaseExpired(now, (hold) =>
    deps.bus.publish({
      type: "SeatsReleased",
      tierId: hold.tierId,
      quantity: hold.quantity,
      orderId: hold.orderId,
    }),
  );

  const availability = deps.store.get(tierId);
  if (!availability) throw new NotFoundError(`Tier ${tierId} not found`);

  if (quantity > availability.quantityRemaining) {
    throw new ConflictError(`Only ${availability.quantityRemaining} seats remaining`, "quantity");
  }

  availability.quantityRemaining -= quantity;
  const orderId = `ord_${randomUUID()}`;
  deps.store.addHold({
    orderId,
    tierId,
    quantity,
    expiresAt: now + (deps.holdTtlMs ?? HOLD_TTL_MS),
  });

  deps.bus.publish({
    type: "SeatsReserved",
    tierId,
    eventId: availability.eventId,
    quantity,
    orderId,
    remaining: availability.quantityRemaining,
  });

  return { orderId, eventId: availability.eventId };
}
