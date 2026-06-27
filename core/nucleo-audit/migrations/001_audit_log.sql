-- nucleo-audit · append-only audit log.
-- Immutability is enforced at the DB level: a trigger rejects UPDATE/DELETE,
-- so the log cannot be tampered with even via raw SQL. See docs/04-security.md
-- (Repudiation mitigation: immutable who/what/when).

CREATE TABLE IF NOT EXISTS audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid        NOT NULL,
  actor_id      uuid,
  action        text        NOT NULL,
  resource_type text,
  resource_id   text,
  metadata      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_org_created_idx
  ON audit_log (org_id, created_at DESC);

CREATE OR REPLACE FUNCTION audit_log_no_mutate() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only (% rejected)', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_no_mutate ON audit_log;
CREATE TRIGGER audit_log_no_mutate
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_no_mutate();
