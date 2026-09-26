-- ============================================================================
-- app_role — the rights of the API's limited key, efactura_app
-- ============================================================================
-- The key itself is created outside migrations: by docker/postgres/init.sql
-- on the PC, once in the Neon dashboard in production. It must exist before
-- this migration runs. No password ever goes in a migration.
--
-- The API can read and write the business tables, but it can't change the
-- tables, switch off the frozen-document triggers, or rewrite the history:
-- only a table's owner can disable its triggers.
-- ============================================================================

GRANT USAGE ON SCHEMA public TO efactura_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO efactura_app;

-- the history is append-only
REVOKE UPDATE, DELETE, TRUNCATE ON activity_log FROM efactura_app;

-- the migration history stays with the owner
-- the check skips Prisma's temporary replay database, which has no history table
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    REVOKE ALL ON _prisma_migrations FROM efactura_app;
  END IF;
END $$;

-- tables added by later migrations get the same rights
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO efactura_app;
