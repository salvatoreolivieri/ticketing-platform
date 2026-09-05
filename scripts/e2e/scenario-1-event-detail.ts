/**
 * Scenario 1 — Event detail screen.
 *
 * One event, one load: title, description, start time, venue name + full
 * address, organizer name, and every tier with its price and seats left.
 *
 * Exercised through the GraphQL gateway: a single request the client makes,
 * which the gateway composes from 4 Catalog REST calls (Approach A).
 *
 *   Run: npm run e2e:1   (or: npx tsx scripts/e2e/scenario-1-event-detail.ts)
 */
import { CATALOG, GATEWAY, check, finish, gql, heading, info, preflight } from "./lib";

heading(
  1,
  "Event detail screen",
  "One screen, one load — title, description, start time, venue name + full address, organizer, all tiers with price & seats left.",
);

if (await preflight([
  { name: "gateway", base: GATEWAY },
  { name: "catalog", base: CATALOG },
])) {
  const EVENT = process.env.E2E_EVENT_ID ?? "evt_00001";

  const query = `query($id: ID!) {
    event(id: $id) {
      id title description startsAt city
      venue { name address }
      organizer { name }
      tiers { id name price quantity }
    }
  }`;

  const res = await gql(query, { id: EVENT });

  check("single GraphQL request returns HTTP 200", res.status === 200, `status ${res.status}`);
  check("no GraphQL errors", res.errors.length === 0, JSON.stringify(res.errors));

  const ev = res.data?.event;
  check("event found in one load", !!ev, EVENT);

  if (ev) {
    check("has title", typeof ev.title === "string" && ev.title.length > 0, ev.title);
    check("has description", typeof ev.description === "string" && ev.description.length > 0);
    check(
      "has a valid start time",
      typeof ev.startsAt === "string" && !Number.isNaN(Date.parse(ev.startsAt)),
      ev.startsAt,
    );
    check("venue name present", !!ev.venue?.name, ev.venue?.name);
    check("venue FULL address present", !!ev.venue?.address, ev.venue?.address);
    check("organizer name present", !!ev.organizer?.name, ev.organizer?.name);
    check("has at least one tier", Array.isArray(ev.tiers) && ev.tiers.length >= 1, `${ev.tiers?.length} tiers`);

    const tiersOk = (ev.tiers ?? []).every(
      (t: any) =>
        typeof t.name === "string" && typeof t.price === "number" && typeof t.quantity === "number",
    );
    check("every tier carries name, price and seats-left (quantity)", tiersOk);

    info("Client made 1 request; the gateway fanned out to 4 Catalog calls (event, venue, organizer, tiers).");
    const t = ev.tiers?.[0];
    if (t) info(`e.g. ${t.name}: £${(t.price / 100).toFixed(2)}, ${t.quantity} seats left`);
  }
}

finish();
