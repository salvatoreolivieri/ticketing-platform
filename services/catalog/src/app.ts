import express, { type Express } from "express";
import cors from "cors";
import { errorMiddleware, notFoundMiddleware, requestLogger } from "@ticketing/shared";
import { catalogRouter } from "./interface/http/router";
import type { CatalogRepository } from "./infrastructure/in-memory-repository";

export function createCatalogApp(repo: CatalogRepository): Express {
  const app = express();
  app.use(requestLogger("catalog")); // print every incoming request
  app.use(cors()); // lets the Swagger UI docs page (a different origin) call this API
  app.use(express.json());
  app.use("/api/v1", catalogRouter(repo));
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}
