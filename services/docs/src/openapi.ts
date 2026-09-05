/**
 * Hand-written OpenAPI 3.0 description of the three REST services
 * (Catalog, Inventory, Orders). The GraphQL gateway is documented separately
 * by Apollo Sandbox and is intentionally not covered here.
 *
 * Every path item carries its own `servers` entry so Swagger UI's "Try it out"
 * targets the correct service port. Base URLs are injected (not hard-coded) so
 * the same spec works when the services are hosted elsewhere.
 */

export type ServiceBaseUrls = {
  catalogUrl: string;
  inventoryUrl: string;
  ordersUrl: string;
};

type Schema = Record<string, unknown>;

/** Wraps a data schema in the standard success envelope. */
function envelope(data: Schema, message = "OK"): Schema {
  return {
    type: "object",
    required: ["success", "status", "data", "errors", "message"],
    properties: {
      success: { type: "boolean", example: true },
      status: { type: "integer", example: 200 },
      data,
      errors: { type: "array", items: { $ref: "#/components/schemas/ApiError" }, example: [] },
      message: { type: "string", example: message },
    },
  };
}

/** Wraps a list schema in the paginated success envelope. */
function paginatedEnvelope(item: Schema): Schema {
  const base = envelope({ type: "array", items: item });
  return {
    ...base,
    required: [...(base.required as string[]), "pagination"],
    properties: {
      ...(base.properties as Schema),
      pagination: { $ref: "#/components/schemas/Pagination" },
    },
  };
}

/** A 200/201 JSON response whose body is an envelope schema. */
function jsonResponse(description: string, schema: Schema): Schema {
  return { description, content: { "application/json": { schema } } };
}

/** A failure response with a concrete example envelope. */
function errorResponse(description: string, status: number, code: string, message: string): Schema {
  return {
    description,
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/ErrorResponse" },
        example: { success: false, status, data: null, errors: [{ code, message }], message },
      },
    },
  };
}

export function buildOpenApiSpec(bases: ServiceBaseUrls): Record<string, unknown> {
  const catalog = { servers: [{ url: `${bases.catalogUrl}/api/v1`, description: "Catalog service" }] };
  const inventory = {
    servers: [{ url: `${bases.inventoryUrl}/api/v1`, description: "Inventory service" }],
  };
  const orders = { servers: [{ url: `${bases.ordersUrl}/api/v1`, description: "Orders service" }] };

  return {
    openapi: "3.0.3",
    info: {
      title: "Ticketing Platform — REST APIs",
      version: "1.0.0",
      description:
        "REST endpoints for the Catalog, Inventory and Orders services. " +
        "All responses share the standard envelope `{ success, status, data, errors, message }` " +
        "(list endpoints add `pagination`). The GraphQL gateway is documented separately at " +
        "http://localhost:4000/graphql (Apollo Sandbox).",
    },
    tags: [
      { name: "Catalog", description: "Read-only event, venue, organizer and tier data (port 4001)" },
      { name: "Inventory", description: "Seat reservations and availability adjustments (port 4002)" },
      { name: "Orders", description: "Order creation and listing (port 4003)" },
    ],
    paths: {
      // ---- Catalog ----------------------------------------------------------
      "/events": {
        ...catalog,
        get: {
          tags: ["Catalog"],
          summary: "Browse events",
          description: "Paginated, optionally filtered by city and/or date range.",
          parameters: [
            { $ref: "#/components/parameters/Page" },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
              description: "Items per page (max 100).",
            },
            {
              name: "city",
              in: "query",
              schema: { type: "string" },
              example: "London",
              description: "Case-insensitive exact city match.",
            },
            {
              name: "date_range",
              in: "query",
              schema: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}\\.\\.\\d{4}-\\d{2}-\\d{2}$" },
              example: "2026-01-01..2026-12-31",
              description: "Inclusive `YYYY-MM-DD..YYYY-MM-DD` range on `startsAt`.",
            },
          ],
          responses: {
            "200": jsonResponse(
              "A page of events",
              paginatedEnvelope({ $ref: "#/components/schemas/EventListRow" }),
            ),
            "400": errorResponse("Invalid pagination or filter", 400, "VALIDATION_ERROR", "limit must be <= 100"),
          },
        },
      },
      "/events/{id}": {
        ...catalog,
        get: {
          tags: ["Catalog"],
          summary: "Get event detail",
          parameters: [{ $ref: "#/components/parameters/EventId" }],
          responses: {
            "200": jsonResponse("Event detail", envelope({ $ref: "#/components/schemas/Event" })),
            "404": errorResponse("Event not found", 404, "NOT_FOUND", "Event evt_99999 not found"),
          },
        },
      },
      "/events/{id}/tiers": {
        ...catalog,
        get: {
          tags: ["Catalog"],
          summary: "List tiers for an event",
          parameters: [{ $ref: "#/components/parameters/EventId" }],
          responses: {
            "200": jsonResponse(
              "Tiers for the event",
              envelope({ type: "array", items: { $ref: "#/components/schemas/Tier" } }),
            ),
            "404": errorResponse("Event not found", 404, "NOT_FOUND", "Event evt_99999 not found"),
          },
        },
      },
      "/venues/{venueId}": {
        ...catalog,
        get: {
          tags: ["Catalog"],
          summary: "Get a venue",
          parameters: [
            { name: "venueId", in: "path", required: true, schema: { type: "string" }, example: "ven_00001" },
          ],
          responses: {
            "200": jsonResponse("Venue", envelope({ $ref: "#/components/schemas/Venue" })),
            "404": errorResponse("Venue not found", 404, "NOT_FOUND", "Venue ven_99999 not found"),
          },
        },
      },
      "/organizers/{organizerId}": {
        ...catalog,
        get: {
          tags: ["Catalog"],
          summary: "Get an organizer",
          parameters: [
            { name: "organizerId", in: "path", required: true, schema: { type: "string" }, example: "org_00001" },
          ],
          responses: {
            "200": jsonResponse("Organizer", envelope({ $ref: "#/components/schemas/Organizer" })),
            "404": errorResponse("Organizer not found", 404, "NOT_FOUND", "Organizer org_99999 not found"),
          },
        },
      },

      // ---- Inventory --------------------------------------------------------
      "/reserves/{tierId}": {
        ...inventory,
        post: {
          tags: ["Inventory"],
          summary: "Reserve seats on a tier",
          description: "Holds seats for 10 minutes. Returns the reservation's order id.",
          parameters: [{ $ref: "#/components/parameters/TierId" }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["quantity"],
                  properties: { quantity: { type: "integer", minimum: 1, example: 2 } },
                },
              },
            },
          },
          responses: {
            "201": jsonResponse(
              "Reservation created",
              envelope({ $ref: "#/components/schemas/Reservation" }, "Created"),
            ),
            "400": errorResponse("Invalid quantity", 400, "VALIDATION_ERROR", "quantity must be >= 1"),
            "404": errorResponse("Tier not found", 404, "NOT_FOUND", "Tier tier_99999 not found"),
            "409": errorResponse("Not enough seats", 409, "CONFLICT", "Only 3 seats remaining"),
          },
        },
      },
      "/inventory/{tierId}": {
        ...inventory,
        patch: {
          tags: ["Inventory"],
          summary: "Adjust a tier's availability",
          description: "Overwrites the total and remaining seat counts. Returns 204 (no body).",
          parameters: [{ $ref: "#/components/parameters/TierId" }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["quantityTotal", "quantityRemaining"],
                  properties: {
                    quantityTotal: { type: "integer", minimum: 0, example: 100 },
                    quantityRemaining: { type: "integer", minimum: 0, example: 80 },
                  },
                },
              },
            },
          },
          responses: {
            "204": { description: "Availability updated (no content)" },
            "400": errorResponse(
              "Invalid counts",
              400,
              "VALIDATION_ERROR",
              "quantityRemaining cannot exceed quantityTotal",
            ),
            "404": errorResponse("Tier not found", 404, "NOT_FOUND", "Tier tier_99999 not found"),
          },
        },
      },

      // ---- Orders -----------------------------------------------------------
      "/orders": {
        ...orders,
        get: {
          tags: ["Orders"],
          summary: "List orders",
          description: "Paginated list, oldest first. Used by the partner nightly sync.",
          parameters: [
            { $ref: "#/components/parameters/Page" },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 100 },
              description: "Items per page (max 100).",
            },
          ],
          responses: {
            "200": jsonResponse(
              "A page of orders",
              paginatedEnvelope({ $ref: "#/components/schemas/Order" }),
            ),
          },
        },
        post: {
          tags: ["Orders"],
          summary: "Create an order",
          description: "Reserves in Inventory first; no order is persisted unless the reservation succeeds.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["tierId", "quantity", "buyerEmail"],
                  properties: {
                    tierId: { type: "string", example: "tier_00001" },
                    quantity: { type: "integer", minimum: 1, example: 2 },
                    buyerEmail: { type: "string", format: "email", example: "buyer@example.com" },
                  },
                },
              },
            },
          },
          responses: {
            "201": jsonResponse("Order created", envelope({ $ref: "#/components/schemas/Order" }, "Created")),
            "400": errorResponse("Invalid body", 400, "VALIDATION_ERROR", "buyerEmail is required"),
            "404": errorResponse("Tier not found", 404, "NOT_FOUND", "Tier tier_99999 not found"),
            "409": errorResponse("Insufficient inventory", 409, "CONFLICT", "Insufficient inventory"),
          },
        },
      },
    },

    components: {
      parameters: {
        Page: {
          name: "page",
          in: "query",
          schema: { type: "integer", minimum: 1, default: 1 },
          description: "1-based page number.",
        },
        EventId: {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
          example: "evt_00001",
        },
        TierId: {
          name: "tierId",
          in: "path",
          required: true,
          schema: { type: "string" },
          example: "tier_00001",
        },
      },
      schemas: {
        ApiError: {
          type: "object",
          required: ["code", "message"],
          properties: {
            code: { type: "string", example: "NOT_FOUND" },
            message: { type: "string", example: "Event evt_99999 not found" },
            field: { type: "string", nullable: true, example: "quantity" },
          },
        },
        ErrorResponse: {
          type: "object",
          required: ["success", "status", "data", "errors", "message"],
          properties: {
            success: { type: "boolean", example: false },
            status: { type: "integer", example: 404 },
            data: { nullable: true, example: null },
            errors: { type: "array", items: { $ref: "#/components/schemas/ApiError" } },
            message: { type: "string", example: "Not found" },
          },
        },
        Pagination: {
          type: "object",
          required: ["page", "limit", "total", "totalPages"],
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 20 },
            total: { type: "integer", example: 42 },
            totalPages: { type: "integer", example: 3 },
          },
        },
        Tier: {
          type: "object",
          required: ["id", "name", "price", "quantityTotal", "quantityRemaining"],
          properties: {
            id: { type: "string", example: "tier_00001" },
            name: { type: "string", example: "General Admission" },
            price: { type: "integer", description: "Integer cents", example: 5000 },
            quantityTotal: { type: "integer", example: 100 },
            quantityRemaining: { type: "integer", example: 42 },
          },
        },
        Venue: {
          type: "object",
          required: ["id", "name", "address"],
          properties: {
            id: { type: "string", example: "ven_00001" },
            name: { type: "string", example: "Wembley Arena" },
            address: { type: "string", example: "Arena Square, London" },
          },
        },
        Organizer: {
          type: "object",
          required: ["id", "name"],
          properties: {
            id: { type: "string", example: "org_00001" },
            name: { type: "string", example: "Live Nation" },
          },
        },
        Event: {
          type: "object",
          required: [
            "id",
            "title",
            "description",
            "startsAt",
            "city",
            "venueId",
            "organizerId",
            "venue",
            "organizer",
            "tiers",
          ],
          properties: {
            id: { type: "string", example: "evt_00001" },
            title: { type: "string", example: "The Midnight — Live" },
            description: { type: "string", example: "An evening of synthwave." },
            startsAt: { type: "string", format: "date-time", example: "2026-06-01T20:00:00.000Z" },
            city: { type: "string", example: "London" },
            venueId: { type: "string", example: "ven_00001" },
            organizerId: { type: "string", example: "org_00001" },
            venue: {
              type: "object",
              required: ["name", "address"],
              properties: {
                name: { type: "string", example: "Wembley Arena" },
                address: { type: "string", example: "Arena Square, London" },
              },
            },
            organizer: {
              type: "object",
              required: ["name"],
              properties: { name: { type: "string", example: "Live Nation" } },
            },
            tiers: { type: "array", items: { $ref: "#/components/schemas/Tier" } },
          },
        },
        EventListRow: {
          type: "object",
          required: ["id", "title", "startsAt", "tier"],
          properties: {
            id: { type: "string", example: "evt_00001" },
            title: { type: "string", example: "The Midnight — Live" },
            startsAt: { type: "string", format: "date-time", example: "2026-06-01T20:00:00.000Z" },
            tier: {
              type: "object",
              required: ["price"],
              description: "Cheapest tier for the event.",
              properties: { price: { type: "integer", description: "Integer cents", example: 3000 } },
            },
          },
        },
        Reservation: {
          type: "object",
          required: ["orderId", "eventId"],
          properties: {
            orderId: { type: "string", example: "ord_9f1c2b7a-..." },
            eventId: { type: "string", example: "evt_00001" },
          },
        },
        Order: {
          type: "object",
          required: ["id", "eventId", "tierId", "quantity", "totalCents", "buyerEmail", "createdAt"],
          properties: {
            id: { type: "string", example: "ord_00001" },
            eventId: { type: "string", example: "evt_00001" },
            tierId: { type: "string", example: "tier_00001" },
            quantity: { type: "integer", example: 2 },
            totalCents: { type: "integer", description: "Integer cents", example: 10000 },
            buyerEmail: { type: "string", format: "email", example: "buyer@example.com" },
            createdAt: { type: "string", format: "date-time", example: "2026-05-01T09:30:00.000Z" },
          },
        },
      },
    },
  };
}
