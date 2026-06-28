/**
 * lyra-collab schema: documents + their Yjs update log.
 * Tenant-scoped (org_id) with RLS (ADR-0006). nebula_app gets DML grants.
 */
exports.shorthands = undefined;

const RLS = (table) => `
  ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
  ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table};
  CREATE POLICY ${table}_tenant_isolation ON ${table}
    USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
    WITH CHECK (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);
  GRANT SELECT, INSERT, UPDATE, DELETE ON ${table} TO nebula_app;
`;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE lyra_docs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id uuid NOT NULL,
      owner_id uuid NOT NULL,
      title text NOT NULL DEFAULT 'Untitled',
      vega_file_id uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE lyra_updates (
      id bigserial PRIMARY KEY,
      doc_id uuid NOT NULL REFERENCES lyra_docs(id),
      org_id uuid NOT NULL,
      update bytea NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX lyra_updates_doc_idx ON lyra_updates (doc_id, id);
  `);
  pgm.sql(RLS('lyra_docs'));
  pgm.sql(RLS('lyra_updates'));
  // bigserial sequence usage for the app role
  pgm.sql('GRANT USAGE, SELECT ON SEQUENCE lyra_updates_id_seq TO nebula_app;');
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS lyra_updates, lyra_docs CASCADE;');
};
