import {
  buildPagination,
  NotFoundError,
  parseDateRange,
  parsePagination,
} from "@ticketing/shared";
import type { Pagination, TierRecord } from "@ticketing/shared";
import type {
  EventDto,
  EventListRowDto,
  OrganizerDto,
  TierDto,
  VenueDto,
} from "../domain/types";
import type { CatalogRepository } from "../infrastructure/in-memory-repository";

function toTier(t: TierRecord): TierDto {
  return {
    id: t.id,
    name: t.name,
    price: t.price,
    quantityTotal: t.quantityTotal,
    quantityRemaining: t.quantityRemaining,
  };
}

export function getEventDetail(repo: CatalogRepository, id: string): EventDto {
  const event = repo.getEvent(id);
  if (!event) throw new NotFoundError(`Event ${id} not found`);
  const venue = repo.getVenue(event.venueId);
  const organizer = repo.getOrganizer(event.organizerId);
  if (!venue) throw new NotFoundError(`Venue ${event.venueId} not found`);
  if (!organizer)
    throw new NotFoundError(`Organizer ${event.organizerId} not found`);
  const tiers = repo.getTiersForEvent(id) ?? [];

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt,
    city: event.city,
    venueId: event.venueId,
    organizerId: event.organizerId,
    venue: { name: venue.name, address: venue.address },
    organizer: { name: organizer.name },
    tiers: tiers.map(toTier),
  };
}

export function getVenue(repo: CatalogRepository, id: string): VenueDto {
  const venue = repo.getVenue(id);
  if (!venue) throw new NotFoundError(`Venue ${id} not found`);
  return { id: venue.id, name: venue.name, address: venue.address };
}

export function getOrganizer(
  repo: CatalogRepository,
  id: string,
): OrganizerDto {
  const organizer = repo.getOrganizer(id);
  if (!organizer) throw new NotFoundError(`Organizer ${id} not found`);
  return { id: organizer.id, name: organizer.name };
}

export function getEventTiers(
  repo: CatalogRepository,
  eventId: string,
): TierDto[] {
  const tiers = repo.getTiersForEvent(eventId);
  if (!tiers) throw new NotFoundError(`Event ${eventId} not found`);
  return tiers.map(toTier);
}

export function listEvents(
  repo: CatalogRepository,
  query: Record<string, unknown>,
): { rows: EventListRowDto[]; pagination: Pagination } {
  const { page, limit, offset } = parsePagination(query, {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100,
  });

  let events = repo.allEvents();

  if (query.city !== undefined) {
    const city = String(query.city).toLowerCase();
    events = events.filter((e) => e.city.toLowerCase() === city);
  }

  if (query.date_range !== undefined) {
    const { start, end } = parseDateRange(query.date_range);
    events = events.filter((e) => {
      const d = new Date(e.startsAt);
      return d >= start && d <= end;
    });
  }

  events = events
    .slice()
    .sort(
      (a, b) =>
        a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id),
    );

  const total = events.length;
  const rows = events
    .slice(offset, offset + limit)
    .map<EventListRowDto>((e) => {
      const tiers = repo.getTiersForEvent(e.id) ?? [];
      const lowest = tiers.reduce(
        (min, t) => Math.min(min, t.price),
        Number.POSITIVE_INFINITY,
      );
      return {
        id: e.id,
        title: e.title,
        startsAt: e.startsAt,
        tier: { price: Number.isFinite(lowest) ? lowest : 0 },
      };
    });

  return { rows, pagination: buildPagination(page, limit, total) };
}
