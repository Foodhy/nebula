/**
 * vega-storage schema: folders, files, file_versions, shares.
 * Every table is tenant-scoped (org_id) with RLS (see @nebula/db / ADR-0006).
 * The non-superuser app role `nebula_app` (infra/compose/initdb) gets DML grants.
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
    CREATE TABLE folders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id uuid NOT NULL,
      owner_id uuid NOT NULL,
      name text NOT NULL,
      parent_folder_id uuid REFERENCES folders(id),
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE files (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id uuid NOT NULL,
      owner_id uuid NOT NULL,
      name text NOT NULL,
      mime_type text NOT NULL DEFAULT 'application/octet-stream',
      size bigint NOT NULL DEFAULT 0,
      parent_folder_id uuid REFERENCES folders(id),
      current_version_id uuid,
      status text NOT NULL DEFAULT 'active',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX files_org_parent_idx ON files (org_id, parent_folder_id);

    CREATE TABLE file_versions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      file_id uuid NOT NULL REFERENCES files(id),
      org_id uuid NOT NULL,
      version_no integer NOT NULL,
      object_key text NOT NULL,
      checksum text,
      size bigint NOT NULL DEFAULT 0,
      created_by uuid NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (file_id, version_no)
    );

    CREATE TABLE shares (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id uuid NOT NULL,
      resource_id uuid NOT NULL,
      resource_type text NOT NULL,
      grantee_type text NOT NULL,
      grantee_id text,
      permission text NOT NULL,
      expires_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX shares_resource_idx ON shares (org_id, resource_id);
  `);

  for (const t of ['folders', 'files', 'file_versions', 'shares']) {
    pgm.sql(RLS(t));
  }
};

exports.down = (pgm) => {
  pgm.sql(
    'DROP TABLE IF EXISTS shares, file_versions, files, folders CASCADE;',
  );
};
