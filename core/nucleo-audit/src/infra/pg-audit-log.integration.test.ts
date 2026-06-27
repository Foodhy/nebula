import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PgAuditLog } from './pg-audit-log.js';

const SCHEMA_SQL = readFileSync(
  fileURLToPath(new URL('../../migrations/001_audit_log.sql', import.meta.url)),
  'utf8',
);

const ORG_A = '00000000-0000-0000-0000-00000000000a';
const ORG_B = '00000000-0000-0000-0000-00000000000b';
const ACTOR = '00000000-0000-0000-0000-000000000002';

let container: StartedPostgreSqlContainer;
let pool: Pool;
let log: PgAuditLog;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  pool = new Pool({ connectionString: container.getConnectionUri() });
  await pool.query(SCHEMA_SQL);
  log = new PgAuditLog(pool);
}, 120_000);

afterAll(async () => {
  await pool?.end();
  await container?.stop();
});

describe('PgAuditLog (integration)', () => {
  it('appends and lists entries newest-first', async () => {
    const a = await log.append({ orgId: ORG_A, actorId: ACTOR, action: 'file.created' });
    const b = await log.append({ orgId: ORG_A, actorId: ACTOR, action: 'file.shared' });
    expect(a.id).not.toBe(b.id);

    const entries = await log.list(ORG_A);
    expect(entries.length).toBeGreaterThanOrEqual(2);
    expect(entries.map((e) => e.action).slice(0, 2)).toEqual(['file.shared', 'file.created']);
  });

  it('scopes list() by org', async () => {
    await log.append({ orgId: ORG_B, action: 'org.created' });
    const aActions = (await log.list(ORG_A)).map((e) => e.action);
    expect(aActions).not.toContain('org.created');
  });

  it('is append-only: raw UPDATE is rejected by the DB', async () => {
    await expect(pool.query(`UPDATE audit_log SET action = 'tampered'`)).rejects.toThrow(
      /append-only/,
    );
  });

  it('is append-only: raw DELETE is rejected by the DB', async () => {
    await expect(pool.query('DELETE FROM audit_log')).rejects.toThrow(/append-only/);
  });
});
