import { recordRead } from "@ticketing/shared";
import type { OrderRecord, TicketRecord } from "@ticketing/shared";
import type { OrdersStore } from "../src/infrastructure/store";

/**
 * In-memory OrdersStore — a test fake. The running service uses
 * PostgresOrdersStore; this exists only to keep the unit suite fast and
 * database-free.
 */
export class InMemoryOrdersStore implements OrdersStore {
  private readonly orders: OrderRecord[];
  private readonly tickets: TicketRecord[];
  private readonly byId = new Map<string, OrderRecord>();

  constructor(orders: OrderRecord[], tickets: TicketRecord[]) {
    this.orders = orders;
    this.tickets = tickets;
    for (const o of orders) this.byId.set(o.id, o);
  }

  async list(): Promise<OrderRecord[]> {
    recordRead("list");
    return this.orders;
  }

  async add(order: OrderRecord): Promise<void> {
    this.orders.push(order);
    this.byId.set(order.id, order);
  }

  async addTicket(ticket: TicketRecord): Promise<void> {
    this.tickets.push(ticket);
  }

  async ticketCount(): Promise<number> {
    recordRead("ticketCount");
    return this.tickets.length;
  }
}
