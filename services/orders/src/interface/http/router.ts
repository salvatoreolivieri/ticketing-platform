import { Router } from "express";
import { asyncHandler, created, paginated } from "@ticketing/shared";
import { createOrder } from "../../application/create-order";
import { listOrders } from "../../application/list-orders";
import type { OrdersDeps } from "../../composition/container";

export function ordersRouter(deps: OrdersDeps): Router {
  const r = Router();

  // Partner nightly sync.
  r.get(
    "/orders",
    asyncHandler(async (req, res) => {
      const { rows, pagination } = await listOrders(
        deps.store,
        req.query as Record<string, unknown>,
      );
      res.status(200).json(paginated(rows, pagination));
    }),
  );

  // Create order (internally calls Inventory).
  r.post(
    "/orders",
    asyncHandler(async (req, res) => {
      const order = await createOrder(deps, (req.body ?? {}) as Record<string, unknown>);
      res.status(201).json(created(order));
    }),
  );

  return r;
}
