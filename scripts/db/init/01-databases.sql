-- Runs once, on first boot, against the bootstrap `postgres` database.
-- Creates one owner role + one database per service. Each role owns its own
-- database and its `public` schema, so Drizzle migrations can create tables
-- with no extra grants. Roles are cluster-global; databases are isolated.
--
-- Passwords here are for LOCAL DEV ONLY and match .env.example.

-- Each database revokes the default PUBLIC CONNECT so only its owner role (and
-- the superuser) can reach it — the shared-nothing boundary, enforced.

-- ── catalog ────────────────────────────────────────────────────────────────
CREATE ROLE catalog_user LOGIN PASSWORD 'catalog_pw';
CREATE DATABASE catalog_db OWNER catalog_user;
REVOKE CONNECT ON DATABASE catalog_db FROM PUBLIC;
GRANT CONNECT ON DATABASE catalog_db TO catalog_user;
\connect catalog_db
GRANT ALL ON SCHEMA public TO catalog_user;
ALTER SCHEMA public OWNER TO catalog_user;

-- ── inventory ────────────────────────────────────────────────────────────────
\connect postgres
CREATE ROLE inventory_user LOGIN PASSWORD 'inventory_pw';
CREATE DATABASE inventory_db OWNER inventory_user;
REVOKE CONNECT ON DATABASE inventory_db FROM PUBLIC;
GRANT CONNECT ON DATABASE inventory_db TO inventory_user;
\connect inventory_db
GRANT ALL ON SCHEMA public TO inventory_user;
ALTER SCHEMA public OWNER TO inventory_user;

-- ── orders ────────────────────────────────────────────────────────────────
\connect postgres
CREATE ROLE orders_user LOGIN PASSWORD 'orders_pw';
CREATE DATABASE orders_db OWNER orders_user;
REVOKE CONNECT ON DATABASE orders_db FROM PUBLIC;
GRANT CONNECT ON DATABASE orders_db TO orders_user;
\connect orders_db
GRANT ALL ON SCHEMA public TO orders_user;
ALTER SCHEMA public OWNER TO orders_user;
