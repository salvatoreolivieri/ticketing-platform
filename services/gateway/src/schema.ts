/** GraphQL SDL. Owns no data — every field maps to a downstream REST call. */
export const typeDefs = /* GraphQL */ `
  type Venue {
    name: String!
    address: String!
  }

  type Organizer {
    name: String!
  }

  type Tier {
    id: ID!
    name: String!
    price: Float!
    quantity: Int!
  }

  type Event {
    id: ID!
    title: String!
    description: String!
    startsAt: String!
    city: String!
    venue: Venue!
    organizer: Organizer!
    tiers: [Tier!]!
  }

  type EventListItem {
    id: ID!
    title: String!
    startsAt: String!
    lowestTierPrice: Float!
  }

  type EventList {
    events: [EventListItem!]!
  }

  type Reservation {
    reservationId: ID!
    tierId: ID!
    quantity: Int!
  }

  type Query {
    event(id: ID!): Event
    events(page: Int!, limit: Int!, city: String, dateRange: String): EventList!
  }

  type Mutation {
    reserveTickets(tierId: ID!, quantity: Int!): Reservation!
  }
`;
