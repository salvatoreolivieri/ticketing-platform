import { createCatalogDb } from "../infrastructure/db/client";
import { PostgresCatalogRepository } from "../infrastructure/pg-repository";
import type { CatalogRepository } from "../infrastructure/repository";

/** Builds the Catalog repository over Postgres (catalog_db). */
export function buildCatalogRepository(): CatalogRepository {
  const { db } = createCatalogDb();
  return new PostgresCatalogRepository(db);
}
