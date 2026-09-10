import { buildPagination, parsePagination } from "@ticketing/shared";
import type { OrderRecord, Pagination } from "@ticketing/shared";
import type { OrdersStore } from "../infrastructure/store";

export async function listOrders(
  store: OrdersStore,
  query: Record<string, unknown>,
): Promise<{ rows: OrderRecord[]; pagination: Pagination }> {
  const { page, limit, offset } = parsePagination(query, {
    defaultPage: 1,
    defaultLimit: 100,
    maxLimit: 100,
  });
  const all = await store.list();
  const sorted = all
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const total = sorted.length;
  const rows = sorted.slice(offset, offset + limit);
  return { rows, pagination: buildPagination(page, limit, total) };
}
