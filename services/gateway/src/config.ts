export const config = {
  port: Number(process.env.GATEWAY_PORT ?? 4000),
  catalogUrl: process.env.CATALOG_URL ?? "http://localhost:4001",
  inventoryUrl: process.env.INVENTORY_URL ?? "http://localhost:4002",
};
