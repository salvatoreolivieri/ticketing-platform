import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { EventBus } from "@ticketing/shared";
import { createInventoryApp } from "../src/app";
import { InMemoryInventoryStore } from "./in-memory-store";
import type { InventoryDeps } from "../src/composition/container";

let deps: InventoryDeps;

beforeEach(() => {
  const store = new InMemoryInventoryStore([
    { tierId: "tier_00001", eventId: "evt_00001", quantityTotal: 10, quantityRemaining: 10 },
  ]);
  deps = { store, bus: new EventBus() };
});

const app = () => createInventoryApp(deps);

describe("Inventory", () => {
  it("INV-001: reserve available tickets -> 201", async () => {
    const res = await request(app()).post("/api/v1/reserves/tier_00001").send({ quantity: 2 });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.eventId).toBe("evt_00001");
    expect(typeof res.body.data.orderId).toBe("string");
  });

  it("INV-002: reserve unavailable (unknown) tier -> 404", async () => {
    const res = await request(app()).post("/api/v1/reserves/tier_99999").send({ quantity: 2 });
    expect(res.status).toBe(404);
    expect(res.body.errors[0].code).toBe("NOT_FOUND");
  });

  it("INV-003: reserve more than available -> 409 with remaining", async () => {
    const res = await request(app()).post("/api/v1/reserves/tier_00001").send({ quantity: 100 });
    expect(res.status).toBe(409);
    expect(res.body.errors[0].code).toBe("CONFLICT");
    expect(res.body.errors[0].message).toContain("10");
  });

  it("INV-004: reserve zero tickets -> 400", async () => {
    const res = await request(app()).post("/api/v1/reserves/tier_00001").send({ quantity: 0 });
    expect(res.status).toBe(400);
  });

  it("INV-005: reserve negative quantity -> 400", async () => {
    const res = await request(app()).post("/api/v1/reserves/tier_00001").send({ quantity: -1 });
    expect(res.status).toBe(400);
  });

  it("INV-006: missing quantity -> 400", async () => {
    const res = await request(app()).post("/api/v1/reserves/tier_00001").send({});
    expect(res.status).toBe(400);
  });

  it("INV-007: inventory update -> 204", async () => {
    const res = await request(app())
      .patch("/api/v1/inventory/tier_00001")
      .send({ quantityTotal: 100, quantityRemaining: 50 });
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  it("INV-008: update unknown tier -> 404", async () => {
    const res = await request(app())
      .patch("/api/v1/inventory/tier_99999")
      .send({ quantityTotal: 100, quantityRemaining: 50 });
    expect(res.status).toBe(404);
  });

  it("INV-009: invalid inventory quantities -> 400", async () => {
    const res = await request(app())
      .patch("/api/v1/inventory/tier_00001")
      .send({ quantityTotal: 100, quantityRemaining: 150 });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe("quantityRemaining");
  });
});
