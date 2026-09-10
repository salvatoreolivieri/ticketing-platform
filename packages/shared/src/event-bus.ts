/** Minimal in-process pub/sub. One bus per service (intra-service only).
 *
 * `publish` awaits each handler in turn, so a handler that persists a
 * projection (e.g. OrderPlaced -> write a ticket row) completes before the
 * command that published the event returns. Handlers may be sync or async. */
export type DomainEvent = { type: string; [key: string]: unknown };
export type EventHandler = (event: DomainEvent) => void | Promise<void>;

export class EventBus {
  private readonly handlers = new Map<string, EventHandler[]>();

  on(type: string, handler: EventHandler): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler);
    this.handlers.set(type, list);
  }

  async publish(event: DomainEvent): Promise<void> {
    for (const handler of this.handlers.get(event.type) ?? []) await handler(event);
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) await this.publish(event);
  }
}
