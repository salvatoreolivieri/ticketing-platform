/**
 * Scenario 2 — Mobile browse list.
 *
 * Up to 20 events for a city + date range. Each row shows ONLY the title, the
 * start time, and the lowest tier price — nothing else. This runs on a phone on
 * 4G, so payload size matters: the list rows must stay tiny.
 *
 *   Run: npm run e2e:2   (or: npx tsx scripts/e2e/scenario-2-browse-list.ts)
 */
import { CATALOG, GATEWAY, check, finish, gql, heading, info, preflight } from "./lib";

heading(
  2,
  "Mobile browse list",
  "20 events for a city + date range. Each row: title, start time, lowest tier price. Nothing else — payload size matters on 4G.",
);

if (await preflight([
  { name: "gateway", base: GATEWAY },
  { name: "catalog", base: CATALOG },
])) {
  const CITY = process.env.E2E_CITY ?? "London";
  const RANGE = process.env.E2E_DATE_RANGE ?? "2026-01-01..2026-12-31";

  const listQuery = `query($p: Int!, $l: Int, $c: String, $d: String) {
    events(page: $p, limit: $l, city: $c, dateRange: $d) {
      events { id title startsAt lowestTierPrice }
    }
  }`;

  const res = await gql(listQuery, { p: 1, l: 20, c: CITY, d: RANGE });

  check("HTTP 200", res.status === 200, `status ${res.status}`);
  check("no GraphQL errors", res.errors.length === 0, JSON.stringify(res.errors));

  const rows: any[] = res.data?.events?.events ?? [];
  check("returns rows for the city", rows.length >= 1, `${rows.length} rows for ${CITY}`);
  check("never exceeds the requested limit of 20", rows.length <= 20, `${rows.length} rows`);

  const EXPECTED = ["id", "lowestTierPrice", "startsAt", "title"]; // sorted keys
  const allSlim = rows.every((r) => JSON.stringify(Object.keys(r).sort()) === JSON.stringify(EXPECTED));
  check("each row carries ONLY {title, startsAt, lowestTierPrice, id} — no venue/description/tiers", allSlim);
  check("lowestTierPrice is a number (integer cents)", rows.every((r) => typeof r.lowestTierPrice === "number"));

  // The limit genuinely caps the page.
  if (rows.length >= 5) {
    const five = await gql(listQuery, { p: 1, l: 5, c: CITY, d: RANGE });
    check("limit=5 returns exactly 5 rows", (five.data?.events?.events?.length ?? 0) === 5);
  }

  // Payload contrast: a browse row vs one full event detail.
  const perRow = rows.length ? Math.round(res.bytes / rows.length) : 0;
  const detail = await gql(
    `query($id: ID!){ event(id:$id){ id title description startsAt city venue{name address} organizer{name} tiers{id name price quantity} } }`,
    { id: rows[0]?.id ?? "evt_00001" },
  );
  info(`Slim list payload: ${res.bytes} B for ${rows.length} rows (~${perRow} B/row).`);
  info(`One full event detail: ${detail.bytes} B — ${(detail.bytes / Math.max(perRow, 1)).toFixed(1)}× a single browse row.`);
  check("a browse row is far smaller than a full event detail", perRow > 0 && perRow < detail.bytes);
}

finish();
