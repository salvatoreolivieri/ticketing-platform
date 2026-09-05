import type { OrderRecord, TicketRecord } from "@ticketing/shared";

/** Owns orders and tickets. */
export class InMemoryOrdersStore {
  private readonly orders: OrderRecord[];
  private readonly tickets: TicketRecord[];
  private readonly byId = new Map<string, OrderRecord>();

  constructor(orders: OrderRecord[], tickets: TicketRecord[]) {
    this.orders = orders;
    this.tickets = tickets;
    for (const o of orders) this.byId.set(o.id, o);
  }

  list(): OrderRecord[] {
    return this.orders;
  }

  add(order: OrderRecord): void {
    this.orders.push(order);
    this.byId.set(order.id, order);
  }

  addTicket(ticket: TicketRecord): void {
    this.tickets.push(ticket);
  }

  ticketCount(): number {
    return this.tickets.length;
  }
}
