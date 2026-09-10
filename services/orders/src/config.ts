export const config = {
  port: Number(process.env.ORDERS_PORT ?? 4003),
  inventoryUrl: process.env.INVENTORY_URL ?? "http://localhost:4002",
  databaseUrl:
    process.env.ORDERS_DATABASE_URL ??
    "postgres://orders_user:orders_pw@localhost:5433/orders_db",
};
