import { describe, expect, it } from "vitest";
import request from "supertest";
import { createGatewayApp } from "../src/app";
import type {
  CatalogClient,
  CatalogEventRow,
  GatewayInventoryClient,
  ListEventsParams,
  RestResult,
} from "../src/clients";

type Calls = Record<string, number>;

function fakeCatalog(calls: Calls): CatalogClient {
  const bump = (k: string) => (calls[k] = (calls[k] ?? 0) + 1);
  return {
    async getEvent(id) {
      bump("getEvent");
      return {
        status: 200,
        data: {
          id,
          title: "Show",
          description: "desc",
          startsAt: "2026-06-01T20:00:00.000Z",
          city: "London",
          venueId: "ven_00001",
          organizerId: "org_00001",
        },
      };
    },
    async getVenue(id) {
      bump("getVenue");
      return { status: 200, data: { id, name: "Wembley", address: "1 High St" } };
    },
    async getOrganizer(id) {
      bump("getOrganizer");
      return { status: 200, data: { id, name: "Org One" } };
    },
    async getEventTiers() {
      bump("getEventTiers");
      return {
        status: 200,
        data: [{ id: "tier_00001", name: "GA", price: 5000, quantityTotal: 100, quantityRemaining: 42 }],
      };
    },
    async listEvents(_params: ListEventsParams): Promise<RestResult<CatalogEventRow[]>> {
      bump("listEvents");
      return {
        status: 200,
        data: [{ id: "evt_00001", title: "Show", startsAt: "2026-06-01T20:00:00.000Z", tier: { price: 3000 } }],
      };
    },
  };
}

const okInventory: GatewayInventoryClient = {
  async reserve() {
    return { status: 201, data: { orderId: "ord_abc", eventId: "evt_00001" } };
  },
};

async function gql(app: Awaited<ReturnType<typeof createGatewayApp>>, query: string, variables?: object) {
  return request(app)
    .post("/graphql")
    .set("accept", "application/json")
    .send({ query, variables });
}

describe("Gateway", () => {
  it("event(id) triggers exactly the 4 documented downstream calls", async () => {
    const calls: Calls = {};
    const app = await createGatewayApp({ catalog: fakeCatalog(calls), inventory: okInventory });
    const res = await gql(
      app,
      `query($id: ID!) { event(id: $id) { id title venue { name address } organizer { name } tiers { id name price quantity } } }`,
      { id: "evt_00001" },
    );
    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    const ev = res.body.data.event;
    expect(ev.venue).toEqual({ name: "Wembley", address: "1 High St" });
    expect(ev.organizer).toEqual({ name: "Org One" });
    expect(ev.tiers[0]).toEqual({ id: "tier_00001", name: "GA", price: 5000, quantity: 42 });
    expect(calls).toEqual({ getEvent: 1, getVenue: 1, getOrganizer: 1, getEventTiers: 1 });
  });

  it("events(...) triggers exactly 1 downstream call", async () => {
    const calls: Calls = {};
    const app = await createGatewayApp({ catalog: fakeCatalog(calls), inventory: okInventory });
    const res = await gql(
      app,
      `query($p: Int!, $l: Int!, $c: String, $d: String) {
        events(page: $p, limit: $l, city: $c, dateRange: $d) { events { id title startsAt lowestTierPrice } }
      }`,
      { p: 1, l: 20, c: "London", d: "2026-01-01..2026-12-31" },
    );
    expect(res.status).toBe(200);
    expect(res.body.data.events.events[0]).toEqual({
      id: "evt_00001",
      title: "Show",
      startsAt: "2026-06-01T20:00:00.000Z",
      lowestTierPrice: 3000,
    });
    expect(calls).toEqual({ listEvents: 1 });
  });

  it("reserveTickets maps orderId -> reservationId", async () => {
    const app = await createGatewayApp({ catalog: fakeCatalog({}), inventory: okInventory });
    const res = await gql(
      app,
      `mutation($t: ID!, $q: Int!) { reserveTickets(tierId: $t, quantity: $q) { reservationId tierId quantity } }`,
      { t: "tier_00001", q: 3 },
    );
    expect(res.status).toBe(200);
    expect(res.body.data.reserveTickets).toEqual({
      reservationId: "ord_abc",
      tierId: "tier_00001",
      quantity: 3,
    });
  });

  it("reserveTickets surfaces a 409 as a GraphQL error", async () => {
    const app = await createGatewayApp({
      catalog: fakeCatalog({}),
      inventory: { async reserve() { return { status: 409 }; } },
    });
    const res = await gql(
      app,
      `mutation { reserveTickets(tierId: "tier_00001", quantity: 100) { reservationId } }`,
    );
    expect(res.body.errors[0].message).toBe("Insufficient inventory");
  });

  it("event(id) returns null when Catalog 404s", async () => {
    const app = await createGatewayApp({
      catalog: { ...fakeCatalog({}), async getEvent() { return { status: 404 }; } },
      inventory: okInventory,
    });
    const res = await gql(app, `{ event(id: "evt_99999") { id } }`);
    expect(res.status).toBe(200);
    expect(res.body.data.event).toBeNull();
  });
});
