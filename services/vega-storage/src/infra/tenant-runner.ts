import { withTenant } from '@nebula/db';
import type { Pool } from 'pg';
import type { Querier } from '../application/ports/db.js';
import type { TenantRunner } from '../application/ports/repos.port.js';

/** TenantRunner backed by @nebula/db withTenant (transaction + RLS app.org_id). */
export class PgTenantRunner implements TenantRunner {
  constructor(private readonly pool: Pool) {}

  run<T>(orgId: string, fn: (db: Querier) => Promise<T>): Promise<T> {
    return withTenant(this.pool, orgId, (client) => fn(client as unknown as Querier));
  }
}
