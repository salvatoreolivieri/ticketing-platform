import type { OrderRecord, TicketRecord } from "@ticketing/shared";

/**
 * Owns orders and the tickets projection. Async so the same interface backs the
 * Postgres store (running service, see pg-orders-store.ts) and the in-memory
 * fake (tests).
 */
export interface OrdersStore {
  list(): Promise<OrderRecord[]>;
  add(order: OrderRecord): Promise<void>;
  addTicket(ticket: TicketRecord): Promise<void>;
  ticketCount(): Promise<number>;
}
