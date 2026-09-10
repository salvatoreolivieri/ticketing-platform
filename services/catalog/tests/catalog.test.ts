import { describe, expect, it } from "vitest";
import request from "supertest";
import type { Catalog } from "@ticketing/shared";
import { createCatalogApp } from "../src/app";
import { InMemoryCatalogRepository } from "./in-memory-repository";
import type { CatalogRepository } from "../src/infrastructure/repository";

const fixture: Catalog = {
  organizers: [{ id: "org_00001", name: "Org One" }],
  venues: [
    { id: "ven_00001", name: "Wembley", address: "1 High St, London", city: "London" },
    { id: "ven_00002", name: "Bercy", address: "2 Rue, Paris", city: "Paris" },
  ],
  tiers: [
    { id: "tier_00001", eventId: "evt_00001", name: "GA", price: 5000, quantityTotal: 100, quantityRemaining: 40 },
    { id: "tier_00002", eventId: "evt_00001", name: "VIP", price: 3000, quantityTotal: 20, quantityRemaining: 5 },
    { id: "tier_00003", eventId: "evt_00002", name: "GA", price: 8000, quantityTotal: 50, quantityRemaining: 50 },
  ],
  events: [
    {
      id: "evt_00001",
      title: "London Show",
      description: "In London",
      startsAt: "2026-06-01T20:00:00.000Z",
      city: "London",
      venueId: "ven_00001",
      organizerId: "org_00001",
      tierIds: ["tier_00001", "tier_00002"],
    },
    {
      id: "evt_00002",
      title: "Paris Show",
      description: "In Paris",
      startsAt: "2026-07-01T20:00:00.000Z",
      city: "Paris",
      venueId: "ven_00002",
      organizerId: "org_00001",
      tierIds: ["tier_00003"],
    },
  ],
};

const app = () => createCatalogApp(new InMemoryCatalogRepository(fixture));

describe("Catalog", () => {
  it("CAT-001: get existing event", async () => {
    const res = await request(app()).get("/api/v1/events/evt_00001");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe("evt_00001");
    expect(res.body.data.venue).toEqual({ name: "Wembley", address: "1 High St, London" });
    expect(res.body.data.organizer).toEqual({ name: "Org One" });
    expect(res.body.data.tiers).toHaveLength(2);
    // additive ids for the gateway (Approach A)
    expect(res.body.data.venueId).toBe("ven_00001");
    expect(res.body.data.organizerId).toBe("org_00001");
  });

  it("CAT-002: event does not exist -> 404", async () => {
    const res = await request(app()).get("/api/v1/events/evt_99999");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errors[0].code).toBe("NOT_FOUND");
  });

  it("CAT-003: catalog service failure -> 500", async () => {
    const throwing: CatalogRepository = {
      getEvent: async () => {
        throw new Error("db down");
      },
      getVenue: async () => undefined,
      getOrganizer: async () => undefined,
      getTiersForEvent: async () => undefined,
      getTiersForEvents: async () => new Map(),
      allEvents: async () => [],
    };
    const res = await request(createCatalogApp(throwing)).get("/api/v1/events/evt_00001");
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.errors[0].code).toBe("INTERNAL_SERVER_ERROR");
  });

  it("CAT-004: get existing venue", async () => {
    const res = await request(app()).get("/api/v1/venues/ven_00001");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ id: "ven_00001", name: "Wembley", address: "1 High St, London" });
  });

  it("CAT-005: venue does not exist -> 404", async () => {
    const res = await request(app()).get("/api/v1/venues/ven_99999");
    expect(res.status).toBe(404);
  });

  it("CAT-006: get existing organizer", async () => {
    const res = await request(app()).get("/api/v1/organizers/org_00001");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ id: "org_00001", name: "Org One" });
  });

  it("CAT-007: organizer does not exist -> 404", async () => {
    const res = await request(app()).get("/api/v1/organizers/org_99999");
    expect(res.status).toBe(404);
  });

  it("CAT-008: get event tiers", async () => {
    const res = await request(app()).get("/api/v1/events/evt_00001/tiers");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toMatchObject({ id: "tier_00001", price: 5000, quantityRemaining: 40 });
  });

  it("CAT-009: tiers for unknown event -> 404", async () => {
    const res = await request(app()).get("/api/v1/events/evt_99999/tiers");
    expect(res.status).toBe(404);
  });

  it("CAT-010: list events with defaults", async () => {
    const res = await request(app()).get("/api/v1/events");
    expect(res.status).toBe(200);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 20, total: 2 });
    expect(res.body.data).toHaveLength(2);
    // lowest tier price for evt_00001 = min(5000, 3000)
    const row = res.body.data.find((r: { id: string }) => r.id === "evt_00001");
    expect(row.tier.price).toBe(3000);
  });

  it("CAT-011: list events with pagination", async () => {
    const res = await request(app()).get("/api/v1/events?page=2&limit=20");
    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(2);
    expect(res.body.data).toHaveLength(0);
  });

  it("CAT-012: filter by city", async () => {
    const res = await request(app()).get("/api/v1/events?city=London");
    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(1);
    expect(res.body.data[0].id).toBe("evt_00001");
  });

  it("CAT-013: filter by date range", async () => {
    const res = await request(app()).get("/api/v1/events?date_range=2026-06-15..2026-08-01");
    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(1);
    expect(res.body.data[0].id).toBe("evt_00002");
  });

  it("CAT-014: invalid pagination (page=-1) -> 400", async () => {
    const res = await request(app()).get("/api/v1/events?page=-1&limit=20");
    expect(res.status).toBe(400);
    expect(res.body.errors[0].code).toBe("VALIDATION_ERROR");
  });

  it("CAT-015: invalid page limit (limit=0) -> 400", async () => {
    const res = await request(app()).get("/api/v1/events?page=1&limit=0");
    expect(res.status).toBe(400);
  });

  it("CAT-016: limit exceeds maximum -> 400", async () => {
    const res = await request(app()).get("/api/v1/events?page=1&limit=1000");
    expect(res.status).toBe(400);
  });

  it("CAT-017: invalid date range -> 400", async () => {
    const res = await request(app()).get("/api/v1/events?date_range=invalid");
    expect(res.status).toBe(400);
  });
});
