import { Router } from "express";
import { asyncHandler, ok, paginated } from "@ticketing/shared";
import {
  getEventDetail,
  getEventTiers,
  getOrganizer,
  getVenue,
  listEvents,
} from "../../application/queries";
import type { CatalogRepository } from "../../infrastructure/repository";

export function catalogRouter(repo: CatalogRepository): Router {
  const r = Router();

  // Browse list — must be declared before the ":id" routes.
  r.get(
    "/events",
    asyncHandler(async (req, res) => {
      const { rows, pagination } = await listEvents(
        repo,
        req.query as Record<string, unknown>,
      );
      res.status(200).json(paginated(rows, pagination));
    }),
  );

  r.get(
    "/events/:id/tiers",
    asyncHandler(async (req, res) => {
      res.status(200).json(ok(await getEventTiers(repo, req.params.id)));
    }),
  );

  r.get(
    "/events/:id",
    asyncHandler(async (req, res) => {
      res.status(200).json(ok(await getEventDetail(repo, req.params.id)));
    }),
  );

  r.get(
    "/venues/:venueId",
    asyncHandler(async (req, res) => {
      res.status(200).json(ok(await getVenue(repo, req.params.venueId)));
    }),
  );

  r.get(
    "/organizers/:organizerId",
    asyncHandler(async (req, res) => {
      res
        .status(200)
        .json(ok(await getOrganizer(repo, req.params.organizerId)));
    }),
  );

  return r;
}
