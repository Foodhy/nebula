-- Non-superuser application role. RLS policies apply to it (a superuser would
-- bypass RLS). Services connect as this role; per-request org scoping is set by
-- @nebula/db withTenant. Dev password only — prod via Vault.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'nebula_app') THEN
    CREATE ROLE nebula_app LOGIN PASSWORD 'changeme';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE nebula TO nebula_app;
GRANT USAGE ON SCHEMA public TO nebula_app;
-- Future tables: each migration GRANTs explicitly; also default-grant for safety.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nebula_app;
