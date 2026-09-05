import { NotFoundError, requireNonNegativeInt, ValidationError } from "@ticketing/shared";
import type { EventBus } from "@ticketing/shared";
import type { InMemoryInventoryStore } from "../infrastructure/in-memory-store";

export type AdjustDeps = { store: InMemoryInventoryStore; bus: EventBus };

export function adjustInventory(
  deps: AdjustDeps,
  tierId: string,
  body: Record<string, unknown>,
): void {
  const quantityTotal = requireNonNegativeInt(body.quantityTotal, "quantityTotal");
  const quantityRemaining = requireNonNegativeInt(body.quantityRemaining, "quantityRemaining");
  if (quantityRemaining > quantityTotal) {
    throw new ValidationError(
      "quantityRemaining cannot exceed quantityTotal",
      "quantityRemaining",
    );
  }

  const availability = deps.store.get(tierId);
  if (!availability) throw new NotFoundError(`Tier ${tierId} not found`);

  availability.quantityTotal = quantityTotal;
  availability.quantityRemaining = quantityRemaining;

  deps.bus.publish({ type: "InventoryAdjusted", tierId, quantityTotal, quantityRemaining });
}
