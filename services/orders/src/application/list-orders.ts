import { buildPagination, parsePagination } from "@ticketing/shared";
import type { OrderRecord, Pagination } from "@ticketing/shared";
import type { InMemoryOrdersStore } from "../infrastructure/in-memory-store";

export function listOrders(
  store: InMemoryOrdersStore,
  query: Record<string, unknown>,
): { rows: OrderRecord[]; pagination: Pagination } {
  const { page, limit, offset } = parsePagination(query, { defaultLimit: 100, maxLimit: 100 });
  const sorted = store
    .list()
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const total = sorted.length;
  const rows = sorted.slice(offset, offset + limit);
  return { rows, pagination: buildPagination(page, limit, total) };
}
