import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tenantRlsSql } from './rls.js';
import { withTenant } from './tenant.js';

const ORG_A = '00000000-0000-0000-0000-00000000000a';
const ORG_B = '00000000-0000-0000-0000-00000000000b';
const APP_PASSWORD = 'app-pw';

let container: StartedPostgreSqlContainer;
let adminPool: Pool;
let appPool: Pool;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  adminPool = new Pool({ connectionString: container.getConnectionUri() });

  // Schema + RLS, seeded as superuser (bypasses RLS for seeding).
  await adminPool.query(`
    CREATE TABLE demo_notes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id uuid NOT NULL,
      body text NOT NULL
    );
  `);
  await adminPool.query(tenantRlsSql('demo_notes'));
  await adminPool.query(`INSERT INTO demo_notes (org_id, body) VALUES ($1,'A1'),($1,'A2')`, [
    ORG_A,
  ]);
  await adminPool.query(`INSERT INTO demo_notes (org_id, body) VALUES ($1,'B1')`, [ORG_B]);

  // Non-superuser app role — RLS actually applies to it.
  await adminPool.query(`CREATE ROLE nebula_app LOGIN PASSWORD '${APP_PASSWORD}'`);
  await adminPool.query('GRANT SELECT, INSERT, UPDATE, DELETE ON demo_notes TO nebula_app');

  appPool = new Pool({
    host: container.getHost(),
    port: container.getMappedPort(5432),
    database: container.getDatabase(),
    user: 'nebula_app',
    password: APP_PASSWORD,
  });
}, 120_000);

afterAll(async () => {
  await appPool?.end();
  await adminPool?.end();
  await container?.stop();
});

describe('RLS tenant isolation (integration, non-superuser role)', () => {
  it('a tenant sees only its own rows', async () => {
    const rows = await withTenant(appPool, ORG_A, (c) =>
      c.query('SELECT body FROM demo_notes ORDER BY body').then((r) => r.rows),
    );
    expect(rows.map((r) => r.body)).toEqual(['A1', 'A2']);
  });

  it('a CRAFTED query for another org returns nothing (RLS, not app filter)', async () => {
    const rows = await withTenant(appPool, ORG_A, (c) =>
      c.query('SELECT * FROM demo_notes WHERE org_id = $1', [ORG_B]).then((r) => r.rows),
    );
    expect(rows).toHaveLength(0);
  });

  it('inserting a row for another org is rejected (WITH CHECK)', async () => {
    await expect(
      withTenant(appPool, ORG_A, (c) =>
        c.query('INSERT INTO demo_notes (org_id, body) VALUES ($1,$2)', [ORG_B, 'evil']),
      ),
    ).rejects.toThrow();
  });

  it('fails closed: no app.org_id set → no rows visible', async () => {
    const client = await appPool.connect();
    try {
      const r = await client.query('SELECT * FROM demo_notes');
      expect(r.rows).toHaveLength(0);
    } finally {
      client.release();
    }
  });

  it('tenant B sees only its own row', async () => {
    const rows = await withTenant(appPool, ORG_B, (c) =>
      c.query('SELECT body FROM demo_notes').then((r) => r.rows),
    );
    expect(rows.map((r) => r.body)).toEqual(['B1']);
  });
});
