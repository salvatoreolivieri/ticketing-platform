import { randomUUID } from "node:crypto";
import { ConflictError, NotFoundError, requirePositiveInt } from "@ticketing/shared";
import type { EventBus } from "@ticketing/shared";
import type { InventoryStore } from "../infrastructure/store";

const HOLD_TTL_MS = 10 * 60 * 1000; // Scenario 3: seats held for 10 minutes.

export type ReserveDeps = {
  store: InventoryStore;
  bus: EventBus;
  now?: () => number;
  holdTtlMs?: number;
};

export type ReservationResult = { orderId: string; eventId: string };

export async function reserveTickets(
  deps: ReserveDeps,
  tierId: string,
  quantityRaw: unknown,
): Promise<ReservationResult> {
  const quantity = requirePositiveInt(quantityRaw, "quantity");
  const now = (deps.now ?? Date.now)();

  const released = await deps.store.releaseExpired(now);
  for (const hold of released) {
    await deps.bus.publish({
      type: "SeatsReleased",
      tierId: hold.tierId,
      quantity: hold.quantity,
      orderId: hold.orderId,
    });
  }

  const orderId = `ord_${randomUUID()}`;
  const expiresAt = now + (deps.holdTtlMs ?? HOLD_TTL_MS);
  const outcome = await deps.store.tryReserve(tierId, quantity, orderId, expiresAt);

  if (outcome.kind === "not_found") throw new NotFoundError(`Tier ${tierId} not found`);
  if (outcome.kind === "insufficient") {
    throw new ConflictError(`Only ${outcome.remaining} seats remaining`, "quantity");
  }

  await deps.bus.publish({
    type: "SeatsReserved",
    tierId,
    eventId: outcome.eventId,
    quantity,
    orderId,
    remaining: outcome.remaining,
  });

  return { orderId, eventId: outcome.eventId };
}
