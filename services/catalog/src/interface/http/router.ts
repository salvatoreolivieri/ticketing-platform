import { Router } from "express";
import { asyncHandler, ok, paginated } from "@ticketing/shared";
import {
  getEventDetail,
  getEventTiers,
  getOrganizer,
  getVenue,
  listEvents,
} from "../../application/queries";
import type { CatalogRepository } from "../../infrastructure/in-memory-repository";

export function catalogRouter(repo: CatalogRepository): Router {
  const r = Router();

  // Browse list — must be declared before the ":id" routes.
  r.get(
    "/events",
    asyncHandler((req, res) => {
      const { rows, pagination } = listEvents(repo, req.query as Record<string, unknown>);
      res.status(200).json(paginated(rows, pagination));
    }),
  );

  r.get(
    "/events/:id/tiers",
    asyncHandler((req, res) => {
      res.status(200).json(ok(getEventTiers(repo, req.params.id)));
    }),
  );

  r.get(
    "/events/:id",
    asyncHandler((req, res) => {
      res.status(200).json(ok(getEventDetail(repo, req.params.id)));
    }),
  );

  r.get(
    "/venues/:venueId",
    asyncHandler((req, res) => {
      res.status(200).json(ok(getVenue(repo, req.params.venueId)));
    }),
  );

  r.get(
    "/organizers/:organizerId",
    asyncHandler((req, res) => {
      res.status(200).json(ok(getOrganizer(repo, req.params.organizerId)));
    }),
  );

  return r;
}
