import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/infrastructure/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.INVENTORY_DATABASE_URL ??
      "postgres://inventory_user:inventory_pw@localhost:5433/inventory_db",
  },
});
