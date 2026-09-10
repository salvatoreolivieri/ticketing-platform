import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/infrastructure/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.CATALOG_DATABASE_URL ??
      "postgres://catalog_user:catalog_pw@localhost:5433/catalog_db",
  },
});
