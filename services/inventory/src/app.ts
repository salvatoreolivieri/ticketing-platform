import express, { type Express } from "express";
import cors from "cors";
import { errorMiddleware, notFoundMiddleware, requestLogger } from "@ticketing/shared";
import { inventoryRouter } from "./interface/http/router";
import type { InventoryDeps } from "./composition/container";

export function createInventoryApp(deps: InventoryDeps): Express {
  const app = express();
  app.use(requestLogger("inventory")); // print every incoming request
  app.use(cors()); // lets the Swagger UI docs page (a different origin) call this API
  app.use(express.json());
  app.use("/api/v1", inventoryRouter(deps));
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}
