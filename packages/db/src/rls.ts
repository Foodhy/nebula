/**
 * SQL to make a table tenant-isolated via Row-Level Security. Use inside a
 * migration after creating the table (which must have an `org_id uuid` column).
 *
 * - ENABLE + FORCE so even the table owner is subject to the policy.
 * - Policy keys off `app.org_id`, set per-request by withTenant().
 * - `current_setting(..., true)` returns NULL when unset → policy matches no rows
 *   (fail-closed) instead of erroring.
 */
export function tenantRlsSql(table: string): string {
  return [
    `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table};`,
    // NULLIF(..,'') because a custom GUC resets to '' (not NULL) after SET LOCAL;
    // '' -> NULL -> matches no rows (fail closed) instead of erroring on ''::uuid.
    `CREATE POLICY ${table}_tenant_isolation ON ${table}`,
    `  USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid)`,
    `  WITH CHECK (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);`,
  ].join('\n');
}

/** Name of the session GUC carrying the current tenant. */
export const ORG_ID_SETTING = 'app.org_id';
