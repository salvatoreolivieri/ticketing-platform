import type { Pagination } from "./envelope";
import { ValidationError } from "./errors";

export type PageParams = { page: number; limit: number; offset: number };

function parseIntParam(raw: unknown, name: string, def: number): number {
  if (raw === undefined || raw === "") return def;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(value);
  if (!Number.isInteger(n))
    throw new ValidationError(`${name} must be an integer`, name);
  return n;
}

export function parsePagination(
  query: Record<string, unknown>,
  {
    defaultLimit,
    maxLimit,
    defaultPage,
  }: { defaultPage: number; defaultLimit: number; maxLimit: number },
): PageParams {
  const page = parseIntParam(defaultPage ?? query.page, "page", defaultPage);
  const limit = parseIntParam(
    defaultLimit ?? query.limit,
    "limit",
    defaultLimit,
  );

  if (page < 1) throw new ValidationError("page must be >= 1", "page");
  if (limit < 1) throw new ValidationError("limit must be >= 1", "limit");
  if (limit > maxLimit)
    throw new ValidationError(`limit must be <= ${maxLimit}`, "limit");
  return { page, limit, offset: (page - 1) * limit };
}

export function buildPagination(
  page: number,
  limit: number,
  total: number,
): Pagination {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}
