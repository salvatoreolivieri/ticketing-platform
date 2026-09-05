export const config = {
  port: Number(process.env.ORDERS_PORT ?? 4003),
  inventoryUrl: process.env.INVENTORY_URL ?? "http://localhost:4002",
};
