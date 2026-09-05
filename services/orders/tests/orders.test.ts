import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { EventBus, type OrderRecord } from "@ticketing/shared";
import { createOrdersApp } from "../src/app";
import { InMemoryOrdersStore } from "../src/infrastructure/in-memory-store";
import type { InventoryClient } from "../src/application/ports";
import type { OrdersDeps } from "../src/composition/container";

function seedOrders(n: number): OrderRecord[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `ord_${String(i + 1).padStart(5, "0")}`,
    eventId: "evt_00001",
    tierId: "tier_00001",
    quantity: 1,
    totalCents: 5000,
    buyerEmail: `buyer${i + 1}@example.com`,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, i % 60, 0)).toISOString(),
  }));
}

function build(inventory: InventoryClient, orders: OrderRecord[] = seedOrders(150)): OrdersDeps {
  const store = new InMemoryOrdersStore(orders.slice(), []);
  const bus = new EventBus();
  bus.on("OrderPlaced", (e) =>
    store.addTicket({
      id: `tkt_${String(e.orderId)}`,
      orderId: String(e.orderId),
      eventId: String(e.eventId),
      tierId: String(e.tierId),
      quantity: Number(e.quantity),
    }),
  );
  return { store, bus, inventory, priceByTier: new Map([["tier_00001", 5000]]) };
}

const okInventory: InventoryClient = {
  reserve: async () => ({ status: 201, data: { orderId: "ord_new1", eventId: "evt_00001" } }),
};

let deps: OrdersDeps;
beforeEach(() => {
  deps = build(okInventory);
});

describe("Orders", () => {
  it("ORD-001: get orders with defaults -> 200", async () => {
    const res = await request(createOrdersApp(deps)).get("/api/v1/orders");
    expect(res.status).toBe(200);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 100, total: 150 });
    expect(res.body.data).toHaveLength(100);
  });

  it("ORD-002: get orders with pagination", async () => {
    const res = await request(createOrdersApp(deps)).get("/api/v1/orders?page=2&limit=100");
    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(2);
    expect(res.body.data).toHaveLength(50);
  });

  it("ORD-003: invalid pagination (page=-1) -> 400", async () => {
    const res = await request(createOrdersApp(deps)).get("/api/v1/orders?page=-1&limit=100");
    expect(res.status).toBe(400);
  });

  it("ORD-004: limit exceeds maximum -> 400", async () => {
    const res = await request(createOrdersApp(deps)).get("/api/v1/orders?page=1&limit=1000");
    expect(res.status).toBe(400);
  });

  it("ORD-005: orders service failure -> 500", async () => {
    const broken = build(okInventory);
    broken.store.list = () => {
      throw new Error("db down");
    };
    const res = await request(createOrdersApp(broken)).get("/api/v1/orders");
    expect(res.status).toBe(500);
    expect(res.body.errors[0].code).toBe("INTERNAL_SERVER_ERROR");
  });

  it("ORD-INT-001: create order with available inventory -> 201", async () => {
    const res = await request(createOrdersApp(deps))
      .post("/api/v1/orders")
      .send({ tierId: "tier_00001", quantity: 2, buyerEmail: "a@b.com" });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe("ord_new1");
    expect(res.body.data.eventId).toBe("evt_00001");
    expect(res.body.data.totalCents).toBe(10000);
    // event-driven projection created the ticket
    expect(deps.store.ticketCount()).toBe(1);
  });

  it("ORD-INT-002: inventory conflict -> 409, no order created", async () => {
    const conflict = build({ reserve: async () => ({ status: 409 }) });
    const before = conflict.store.list().length;
    const res = await request(createOrdersApp(conflict))
      .post("/api/v1/orders")
      .send({ tierId: "tier_00001", quantity: 100, buyerEmail: "a@b.com" });
    expect(res.status).toBe(409);
    expect(conflict.store.list().length).toBe(before);
  });

  it("ORD-INT-003: inventory tier not found -> 404, no order created", async () => {
    const notFound = build({ reserve: async () => ({ status: 404 }) });
    const before = notFound.store.list().length;
    const res = await request(createOrdersApp(notFound))
      .post("/api/v1/orders")
      .send({ tierId: "tier_99999", quantity: 2, buyerEmail: "a@b.com" });
    expect(res.status).toBe(404);
    expect(notFound.store.list().length).toBe(before);
  });

  it("ORD-INT-004: inventory unavailable -> 500, no order created", async () => {
    const down = build({ reserve: async () => ({ status: 500 }) });
    const before = down.store.list().length;
    const res = await request(createOrdersApp(down))
      .post("/api/v1/orders")
      .send({ tierId: "tier_00001", quantity: 2, buyerEmail: "a@b.com" });
    expect(res.status).toBe(500);
    expect(down.store.list().length).toBe(before);
  });
});
