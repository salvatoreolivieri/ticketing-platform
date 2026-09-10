import express, { type Express } from "express";
import cors from "cors";
import {
  dbReadLogger,
  errorMiddleware,
  notFoundMiddleware,
  requestLogger,
} from "@ticketing/shared";
import { ordersRouter } from "./interface/http/router";
import type { OrdersDeps } from "./composition/container";

export function createOrdersApp(deps: OrdersDeps): Express {
  const app = express();
  app.use(requestLogger("orders")); // print every incoming request
  app.use(dbReadLogger("orders")); // print the data-store reads each request makes
  app.use(cors()); // lets the Swagger UI docs page (a different origin) call this API
  app.use(express.json());
  app.use("/api/v1", ordersRouter(deps));
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}
