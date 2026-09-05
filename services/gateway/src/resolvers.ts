import { GraphQLError } from "graphql";
import type { CatalogClient, GatewayInventoryClient } from "./clients";

export type GatewayClients = {
  catalog: CatalogClient;
  inventory: GatewayInventoryClient;
};

/**
 * Root resolvers — each GraphQL field is a direct call (or a fixed fan-out) to a
 * REST service. `event(id)` makes the 4 calls the design specifies (Approach A).
 */
export function makeRoot({ catalog, inventory }: GatewayClients) {
  return {
    event: async ({ id }: { id: string }) => {
      const ev = await catalog.getEvent(id); // call 1
      if (ev.status === 404 || !ev.data) return null;

      const [venue, organizer, tiers] = await Promise.all([
        catalog.getVenue(ev.data.venueId), // call 2
        catalog.getOrganizer(ev.data.organizerId), // call 3
        catalog.getEventTiers(id), // call 4
      ]);

      return {
        id: ev.data.id,
        title: ev.data.title,
        description: ev.data.description,
        startsAt: ev.data.startsAt,
        city: ev.data.city,
        venue: {
          name: venue.data?.name ?? "",
          address: venue.data?.address ?? "",
        },
        organizer: { name: organizer.data?.name ?? "" },
        tiers: (tiers.data ?? []).map((t) => ({
          id: t.id,
          name: t.name,
          price: t.price,
          quantity: t.quantityRemaining, // GraphQL Tier.quantity = seats left
        })),
      };
    },

    events: async (args: {
      page: number;
      limit: number;
      city: string;
      dateRange: string;
    }) => {
      const r = await catalog.listEvents({
        page: args.page,
        limit: args.limit,
        city: args.city,
        date_range: args.dateRange,
      });

      return {
        events: (r.data ?? []).map((row) => ({
          id: row.id,
          title: row.title,
          startsAt: row.startsAt,
          lowestTierPrice: row.tier.price,
        })),
      };
    },

    reserveTickets: async ({
      tierId,
      quantity,
    }: {
      tierId: string;
      quantity: number;
    }) => {
      const r = await inventory.reserve(tierId, quantity);
      if (r.status === 404) throw new GraphQLError("Tier not found");
      if (r.status === 409) throw new GraphQLError("Insufficient inventory");
      if (r.status !== 201 || !r.data)
        throw new GraphQLError("Reservation failed");
      return { reservationId: r.data.orderId, tierId, quantity };
    },
  };
}
