import { describe, expect, it } from "vitest";
import request from "supertest";
import { createDocsApp } from "../src/app";
import { buildOpenApiSpec } from "../src/openapi";

const bases = {
  catalogUrl: "http://localhost:4001",
  inventoryUrl: "http://localhost:4002",
  ordersUrl: "http://localhost:4003",
};

describe("Docs service", () => {
  it("serves the OpenAPI document at /openapi.json", async () => {
    const app = createDocsApp(bases);
    const res = await request(app).get("/openapi.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe("3.0.3");
    expect(res.body.info.title).toContain("Ticketing Platform");
  });

  it("serves the Swagger UI HTML at /docs/", async () => {
    const app = createDocsApp(bases);
    const res = await request(app).get("/docs/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("swagger-ui");
  });

  it("redirects / to /docs", async () => {
    const app = createDocsApp(bases);
    const res = await request(app).get("/");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/docs");
  });

  it("documents every REST route, each pointing at its service port", () => {
    const spec = buildOpenApiSpec(bases) as {
      paths: Record<string, { servers: { url: string }[] } & Record<string, unknown>>;
    };
    const paths = spec.paths;

    // All documented routes are present.
    expect(Object.keys(paths).sort()).toEqual(
      [
        "/events",
        "/events/{id}",
        "/events/{id}/tiers",
        "/inventory/{tierId}",
        "/orders",
        "/organizers/{organizerId}",
        "/reserves/{tierId}",
        "/venues/{venueId}",
      ].sort(),
    );

    // Each path targets the correct service base URL for "Try it out".
    expect(paths["/events"].servers[0].url).toBe("http://localhost:4001/api/v1");
    expect(paths["/reserves/{tierId}"].servers[0].url).toBe("http://localhost:4002/api/v1");
    expect(paths["/orders"].servers[0].url).toBe("http://localhost:4003/api/v1");
  });
});
