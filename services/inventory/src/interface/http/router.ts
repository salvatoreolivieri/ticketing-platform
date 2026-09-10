import { Router } from "express";
import { asyncHandler, created } from "@ticketing/shared";
import { adjustInventory } from "../../application/adjust-inventory";
import { reserveTickets } from "../../application/reserve-tickets";
import type { InventoryDeps } from "../../composition/container";

export function inventoryRouter(deps: InventoryDeps): Router {
  const r = Router();

  // Attendee holds tickets.
  r.post(
    "/reserves/:tierId",
    asyncHandler(async (req, res) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const result = await reserveTickets(deps, req.params.tierId, body.quantity);
      res.status(201).json(created(result));
    }),
  );

  // Live availability.
  r.patch(
    "/inventory/:tierId",
    asyncHandler(async (req, res) => {
      await adjustInventory(deps, req.params.tierId, (req.body ?? {}) as Record<string, unknown>);
      res.status(204).send();
    }),
  );

  return r;
}
