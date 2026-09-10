export const config = {
  port: Number(process.env.CATALOG_PORT ?? 4001),
  databaseUrl:
    process.env.CATALOG_DATABASE_URL ??
    "postgres://catalog_user:catalog_pw@localhost:5433/catalog_db",
};
