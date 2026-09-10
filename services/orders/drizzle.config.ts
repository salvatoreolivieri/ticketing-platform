import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/infrastructure/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.ORDERS_DATABASE_URL ??
      "postgres://orders_user:orders_pw@localhost:5433/orders_db",
  },
});
