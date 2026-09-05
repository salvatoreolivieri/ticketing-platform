import { generateCatalog } from "@ticketing/shared";
import { InMemoryCatalogRepository } from "../infrastructure/in-memory-repository";

/** Builds the Catalog repository from the deterministic large seed. */
export function buildCatalogRepository(): InMemoryCatalogRepository {
  return new InMemoryCatalogRepository(generateCatalog());
}
