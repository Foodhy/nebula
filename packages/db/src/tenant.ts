import type { Pool, PoolClient } from 'pg';

/**
 * Run a unit of work scoped to one tenant. Opens a transaction, sets
 * `app.org_id` transaction-locally (pooler-safe), runs `fn` with that client,
 * and commits. RLS policies (see tenantRlsSql) then restrict every query in `fn`
 * to that org. `orgId` MUST come from the validated JWT, never the client.
 */
export async function withTenant<T>(
  pool: Pool,
  orgId: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // set_config(key, value, is_local=true) === SET LOCAL, but parameterizable.
    await client.query('SELECT set_config($1, $2, true)', ['app.org_id', orgId]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
