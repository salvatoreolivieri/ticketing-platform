/**
 * Postgres connection for orders_db. Returns the Drizzle handle plus the
 * underlying pool so callers can close it.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "../../config";
import * as schema from "./schema";

export type OrdersDb = ReturnType<typeof createOrdersDb>["db"];

export function createOrdersDb(connectionString: string = config.databaseUrl) {
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });
  return { db, pool };
}
