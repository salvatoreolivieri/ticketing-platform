/** Downstream REST client ports the resolvers depend on (injected, so tests can fake them). */

export type RestResult<T> = { status: number; data?: T };

export type CatalogEvent = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  city: string;
  venueId: string;
  organizerId: string;
};

export type CatalogVenue = { id: string; name: string; address: string };
export type CatalogOrganizer = { id: string; name: string };
export type CatalogTier = {
  id: string;
  name: string;
  price: number;
  quantityTotal: number;
  quantityRemaining: number;
};
export type CatalogEventRow = { id: string; title: string; startsAt: string; tier: { price: number } };

export type ListEventsParams = {
  page: number;
  limit: number;
  city?: string;
  date_range?: string;
};

export interface CatalogClient {
  getEvent(id: string): Promise<RestResult<CatalogEvent>>;
  getVenue(id: string): Promise<RestResult<CatalogVenue>>;
  getOrganizer(id: string): Promise<RestResult<CatalogOrganizer>>;
  getEventTiers(id: string): Promise<RestResult<CatalogTier[]>>;
  listEvents(params: ListEventsParams): Promise<RestResult<CatalogEventRow[]>>;
}

export interface GatewayInventoryClient {
  reserve(
    tierId: string,
    quantity: number,
  ): Promise<RestResult<{ orderId: string; eventId: string }>>;
}

async function getJson<T>(url: string): Promise<RestResult<T>> {
  try {
    const resp = await fetch(url);
    const body = (await resp.json().catch(() => undefined)) as { data?: T } | undefined;
    return { status: resp.status, data: body?.data };
  } catch {
    return { status: 500 };
  }
}

export class HttpCatalogClient implements CatalogClient {
  constructor(private readonly baseUrl: string) {}

  getEvent(id: string): Promise<RestResult<CatalogEvent>> {
    return getJson(`${this.baseUrl}/api/v1/events/${encodeURIComponent(id)}`);
  }

  getVenue(id: string): Promise<RestResult<CatalogVenue>> {
    return getJson(`${this.baseUrl}/api/v1/venues/${encodeURIComponent(id)}`);
  }

  getOrganizer(id: string): Promise<RestResult<CatalogOrganizer>> {
    return getJson(`${this.baseUrl}/api/v1/organizers/${encodeURIComponent(id)}`);
  }

  getEventTiers(id: string): Promise<RestResult<CatalogTier[]>> {
    return getJson(`${this.baseUrl}/api/v1/events/${encodeURIComponent(id)}/tiers`);
  }

  listEvents(params: ListEventsParams): Promise<RestResult<CatalogEventRow[]>> {
    const q = new URLSearchParams();
    q.set("page", String(params.page));
    q.set("limit", String(params.limit));
    if (params.city) q.set("city", params.city);
    if (params.date_range) q.set("date_range", params.date_range);
    return getJson(`${this.baseUrl}/api/v1/events?${q.toString()}`);
  }
}

export class HttpInventoryClient implements GatewayInventoryClient {
  constructor(private readonly baseUrl: string) {}

  async reserve(
    tierId: string,
    quantity: number,
  ): Promise<RestResult<{ orderId: string; eventId: string }>> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/v1/reserves/${encodeURIComponent(tierId)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      const body = (await resp.json().catch(() => undefined)) as
        | { data?: { orderId: string; eventId: string } }
        | undefined;
      return { status: resp.status, data: body?.data };
    } catch {
      return { status: 500 };
    }
  }
}
