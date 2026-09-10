import { sql } from "drizzle-orm";
import { recordRead } from "@ticketing/shared";
import type { OrderRecord, TicketRecord } from "@ticketing/shared";
import type { OrdersDb } from "./db/client";
import { orders, tickets } from "./db/schema";
import type { OrdersStore } from "./store";

type OrderRow = typeof orders.$inferSelect;

function toOrderRecord(row: OrderRow): OrderRecord {
  return {
    id: row.id,
    eventId: row.eventId,
    tierId: row.tierId,
    quantity: row.quantity,
    totalCents: row.totalCents,
    buyerEmail: row.buyerEmail,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Postgres-backed orders + tickets. `list()` returns every order and the query
 * layer sorts/paginates in memory (parity with the original in-memory path);
 * pushing ORDER BY / LIMIT into SQL is a later optimization.
 */
export class PostgresOrdersStore implements OrdersStore {
  constructor(private readonly db: OrdersDb) {}

  async list(): Promise<OrderRecord[]> {
    recordRead("list");
    const rows = await this.db.select().from(orders);
    return rows.map(toOrderRecord);
  }

  async add(order: OrderRecord): Promise<void> {
    await this.db
      .insert(orders)
      .values({ ...order, createdAt: new Date(order.createdAt) });
  }

  async addTicket(ticket: TicketRecord): Promise<void> {
    await this.db.insert(tickets).values(ticket);
  }

  async ticketCount(): Promise<number> {
    recordRead("ticketCount");
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(tickets);
    return row?.count ?? 0;
  }
}
