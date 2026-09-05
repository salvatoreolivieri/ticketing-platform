export const config = {
  port: Number(process.env.DOCS_PORT ?? 4004),
  catalogUrl: process.env.CATALOG_URL ?? "http://localhost:4001",
  inventoryUrl: process.env.INVENTORY_URL ?? "http://localhost:4002",
  ordersUrl: process.env.ORDERS_URL ?? "http://localhost:4003",
};
