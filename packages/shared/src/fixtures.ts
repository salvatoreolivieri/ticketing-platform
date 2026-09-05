/**
 * Deterministic dataset generator shared by all services.
 *
 * No `Math.random` / `Date.now` — everything derives from fixed seeds, so every
 * service (and every test run) sees identical ids, prices and volumes. Each
 * service loads only the slice it owns:
 *   - Catalog   -> organizers, venues, events, tiers
 *   - Inventory -> tier availability (from tiers)
 *   - Orders    -> orders, tickets, and a tierId -> price snapshot
 *
 * Prices are integer cents throughout (Tier.price and Order.totalCents).
 */
import { eventId, organizerId, orderId, ticketId, tierId, venueId } from "./ids";

export type OrganizerRecord = { id: string; name: string };

export type VenueRecord = { id: string; name: string; address: string; city: string };

export type TierRecord = {
  id: string;
  eventId: string;
  name: string;
  price: number; // integer cents
  quantityTotal: number;
  quantityRemaining: number;
};

export type EventRecord = {
  id: string;
  title: string;
  description: string;
  startsAt: string; // ISO 8601
  city: string;
  venueId: string;
  organizerId: string;
  tierIds: string[];
};

export type OrderRecord = {
  id: string;
  eventId: string;
  tierId: string;
  quantity: number;
  totalCents: number;
  buyerEmail: string;
  createdAt: string; // ISO 8601
};

export type TicketRecord = {
  id: string;
  orderId: string;
  eventId: string;
  tierId: string;
  quantity: number;
};

export type Catalog = {
  organizers: OrganizerRecord[];
  venues: VenueRecord[];
  events: EventRecord[];
  tiers: TierRecord[];
};

export type CatalogCounts = { organizers: number; venues: number; events: number };

// mulberry32 — tiny deterministic PRNG.
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CITIES = ["London", "Paris", "Berlin", "Madrid", "Rome", "Amsterdam", "Lisbon", "Dublin"];
const ORGANIZER_NAMES = [
  "LiveNation",
  "Eventbrite Collective",
  "OpenAir Co",
  "Metropolis Events",
  "Northern Lights",
  "Sunset Promotions",
  "Grand Stage",
  "City Sounds",
];
const VENUE_KINDS = ["Arena", "Hall", "Gardens", "Theatre", "Stadium", "Pavilion"];
const STREETS = [
  "High St",
  "Market Sq",
  "Kings Rd",
  "Station Ave",
  "Riverside",
  "Park Lane",
  "Cathedral Way",
  "Harbour View",
];
const TITLES = [
  "Summer Fest",
  "Jazz Night",
  "Tech Conf",
  "Food & Wine Expo",
  "Marathon",
  "Art Biennale",
  "Indie Showcase",
  "Comedy Gala",
  "Film Premiere",
  "Startup Summit",
];
const TIER_NAMES = ["General Admission", "Early Bird", "VIP", "Backstage"];

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)]!;
}

function intBetween(rand: () => number, min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

export function generateCatalog(
  counts: CatalogCounts = { organizers: 8, venues: 30, events: 120 },
): Catalog {
  const rand = prng(0x1234abcd);

  const organizers: OrganizerRecord[] = Array.from({ length: counts.organizers }, (_, i) => ({
    id: organizerId(i + 1),
    name: ORGANIZER_NAMES[i % ORGANIZER_NAMES.length]!,
  }));

  const venues: VenueRecord[] = Array.from({ length: counts.venues }, (_, i) => {
    const city = CITIES[i % CITIES.length]!;
    return {
      id: venueId(i + 1),
      name: `${city} ${pick(rand, VENUE_KINDS)}`,
      address: `${intBetween(rand, 1, 200)} ${pick(rand, STREETS)}, ${city}`,
      city,
    };
  });

  const events: EventRecord[] = [];
  const tiers: TierRecord[] = [];
  let tierSeq = 0;

  for (let i = 0; i < counts.events; i++) {
    const id = eventId(i + 1);
    const venue = venues[intBetween(rand, 0, venues.length - 1)]!;
    const organizer = organizers[intBetween(rand, 0, organizers.length - 1)]!;

    const dayOffset = intBetween(rand, 0, 364);
    const hour = intBetween(rand, 10, 22);
    const startsAt = new Date(Date.UTC(2026, 0, 1 + dayOffset, hour, 0, 0)).toISOString();

    const tierCount = intBetween(rand, 2, 4);
    const tierIds: string[] = [];
    for (let t = 0; t < tierCount; t++) {
      tierSeq += 1;
      const tId = tierId(tierSeq);
      const total = intBetween(rand, 50, 500);
      const remaining = intBetween(rand, 0, total);
      tiers.push({
        id: tId,
        eventId: id,
        name: TIER_NAMES[t % TIER_NAMES.length]!,
        price: intBetween(rand, 15, 250) * 100, // cents (£15–£250)
        quantityTotal: total,
        quantityRemaining: remaining,
      });
      tierIds.push(tId);
    }

    events.push({
      id,
      title: `${pick(rand, TITLES)} 2026`,
      description: `${pick(rand, TITLES)} in ${venue.city}. A can't-miss event at ${venue.name}.`,
      startsAt,
      city: venue.city,
      venueId: venue.id,
      organizerId: organizer.id,
      tierIds,
    });
  }

  return { organizers, venues, events, tiers };
}

export function generateOrders(
  catalog: Catalog,
  count = 50000,
): { orders: OrderRecord[]; tickets: TicketRecord[] } {
  const rand = prng(0x9e3779b1);
  const orders: OrderRecord[] = [];
  const tickets: TicketRecord[] = [];
  const priceByTier = new Map(catalog.tiers.map((t) => [t.id, t.price] as const));
  const eventByTier = new Map(catalog.tiers.map((t) => [t.id, t.eventId] as const));

  for (let i = 0; i < count; i++) {
    const tier = catalog.tiers[intBetween(rand, 0, catalog.tiers.length - 1)]!;
    const quantity = intBetween(rand, 1, 6);
    const id = orderId(i + 1);
    const dayOffset = intBetween(rand, 0, 364);
    const createdAt = new Date(
      Date.UTC(2026, 0, 1 + dayOffset, intBetween(rand, 0, 23), intBetween(rand, 0, 59), 0),
    ).toISOString();
    const event = eventByTier.get(tier.id)!;
    orders.push({
      id,
      eventId: event,
      tierId: tier.id,
      quantity,
      totalCents: (priceByTier.get(tier.id) ?? 0) * quantity,
      buyerEmail: `buyer${i + 1}@example.com`,
      createdAt,
    });
    tickets.push({ id: ticketId(i + 1), orderId: id, eventId: event, tierId: tier.id, quantity });
  }

  return { orders, tickets };
}

export function priceSnapshot(catalog: Catalog): Map<string, number> {
  return new Map(catalog.tiers.map((t) => [t.id, t.price] as const));
}
