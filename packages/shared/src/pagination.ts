import type { Pagination } from "./envelope";
import { ValidationError } from "./errors";

export type PageParams = { page: number; limit: number; offset: number };

function parseIntParam(raw: unknown, name: string, def: number): number {
  if (raw === undefined || raw === "") return def;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(value);
  if (!Number.isInteger(n)) throw new ValidationError(`${name} must be an integer`, name);
  return n;
}

export function parsePagination(
  query: Record<string, unknown>,
  opts: { defaultLimit: number; maxLimit: number },
): PageParams {
  const page = parseIntParam(query.page, "page", 1);
  const limit = parseIntParam(query.limit, "limit", opts.defaultLimit);
  if (page < 1) throw new ValidationError("page must be >= 1", "page");
  if (limit < 1) throw new ValidationError("limit must be >= 1", "limit");
  if (limit > opts.maxLimit) throw new ValidationError(`limit must be <= ${opts.maxLimit}`, "limit");
  return { page, limit, offset: (page - 1) * limit };
}

export function buildPagination(page: number, limit: number, total: number): Pagination {
  return { page, limit, total, totalPages: total === 0 ? 0 : Math.ceil(total / limit) };
}
