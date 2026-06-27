/**
 * EXAMPLE migration (node-pg-migrate) showing the tenant-table convention.
 * Copy this shape into a real service's migrations/ folder. Kept here as the
 * documented reference; not part of any service schema.
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS example_notes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id uuid NOT NULL,
      body text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    ALTER TABLE example_notes ENABLE ROW LEVEL SECURITY;
    ALTER TABLE example_notes FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS example_notes_tenant_isolation ON example_notes;
    CREATE POLICY example_notes_tenant_isolation ON example_notes
      USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
      WITH CHECK (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS example_notes;');
};
