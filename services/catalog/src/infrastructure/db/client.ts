/**
 * Postgres connection for catalog_db. Returns the Drizzle handle plus the
 * underlying pool so callers (seed scripts, tests) can close it. Runtime
 * composition (Phase 2) will build a repository around `db`.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "../../config";
import * as schema from "./schema";

export type CatalogDb = ReturnType<typeof createCatalogDb>["db"];

export function createCatalogDb(connectionString: string = config.databaseUrl) {
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });
  return { db, pool };
}
