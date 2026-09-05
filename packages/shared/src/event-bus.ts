/** Minimal synchronous in-process pub/sub. One bus per service (intra-service only). */
export type DomainEvent = { type: string; [key: string]: unknown };
export type EventHandler = (event: DomainEvent) => void;

export class EventBus {
  private readonly handlers = new Map<string, EventHandler[]>();

  on(type: string, handler: EventHandler): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler);
    this.handlers.set(type, list);
  }

  publish(event: DomainEvent): void {
    for (const handler of this.handlers.get(event.type) ?? []) handler(event);
  }

  publishAll(events: DomainEvent[]): void {
    for (const event of events) this.publish(event);
  }
}
