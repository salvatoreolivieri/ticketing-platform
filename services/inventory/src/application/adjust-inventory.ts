import { NotFoundError, requireNonNegativeInt, ValidationError } from "@ticketing/shared";
import type { EventBus } from "@ticketing/shared";
import type { InventoryStore } from "../infrastructure/store";

export type AdjustDeps = { store: InventoryStore; bus: EventBus };

export async function adjustInventory(
  deps: AdjustDeps,
  tierId: string,
  body: Record<string, unknown>,
): Promise<void> {
  const quantityTotal = requireNonNegativeInt(body.quantityTotal, "quantityTotal");
  const quantityRemaining = requireNonNegativeInt(body.quantityRemaining, "quantityRemaining");
  if (quantityRemaining > quantityTotal) {
    throw new ValidationError(
      "quantityRemaining cannot exceed quantityTotal",
      "quantityRemaining",
    );
  }

  const found = await deps.store.setAvailability(tierId, quantityTotal, quantityRemaining);
  if (!found) throw new NotFoundError(`Tier ${tierId} not found`);

  await deps.bus.publish({ type: "InventoryAdjusted", tierId, quantityTotal, quantityRemaining });
}
