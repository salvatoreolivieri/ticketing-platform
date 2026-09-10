/**
 * Postgres connection for inventory_db. Returns the Drizzle handle plus the
 * underlying pool so callers can close it.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "../../config";
import * as schema from "./schema";

export type InventoryDb = ReturnType<typeof createInventoryDb>["db"];

export function createInventoryDb(
  connectionString: string = config.databaseUrl,
) {
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });
  return { db, pool };
}
