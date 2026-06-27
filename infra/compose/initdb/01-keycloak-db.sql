-- Create a dedicated database for Keycloak (separate from the Nébula app DB).
-- Runs once on first Postgres init (empty data volume).
SELECT 'CREATE DATABASE keycloak'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloak')\gexec
