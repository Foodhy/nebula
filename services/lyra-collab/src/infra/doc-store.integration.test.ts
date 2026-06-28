import { tenantRlsSql } from '@nebula/db';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { buildDoc, docText } from '../collab/yjs-persistence.js';
import { DocStore } from './doc-store.js';

const ORG_A = '00000000-0000-0000-0000-0000000000a0';
const ORG_B = '00000000-0000-0000-0000-0000000000b0';
const USER = '00000000-0000-0000-0000-00000000a001';

let pg: StartedPostgreSqlContainer;
let adminPool: Pool;
let appPool: Pool;
let store: DocStore;

beforeAll(async () => {
  pg = await new PostgreSqlContainer('postgres:16-alpine').start();
  adminPool = new Pool({ connectionString: pg.getConnectionUri() });
  await adminPool.query(`
    CREATE TABLE lyra_docs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), org_id uuid NOT NULL,
      owner_id uuid NOT NULL, title text NOT NULL DEFAULT 'Untitled', vega_file_id uuid,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE lyra_updates (id bigserial PRIMARY KEY, doc_id uuid NOT NULL, org_id uuid NOT NULL,
      update bytea NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
  `);
  await adminPool.query(tenantRlsSql('lyra_docs'));
  await adminPool.query(tenantRlsSql('lyra_updates'));
  await adminPool.query(`CREATE ROLE nebula_app LOGIN PASSWORD 'app-pw'`);
  await adminPool.query(
    'GRANT SELECT, INSERT, UPDATE, DELETE ON lyra_docs, lyra_updates TO nebula_app',
  );
  await adminPool.query('GRANT USAGE, SELECT ON SEQUENCE lyra_updates_id_seq TO nebula_app');

  appPool = new Pool({
    host: pg.getHost(),
    port: pg.getMappedPort(5432),
    database: pg.getDatabase(),
    user: 'nebula_app',
    password: 'app-pw',
  });
  store = new DocStore(appPool);
}, 120_000);

afterAll(async () => {
  await appPool?.end();
  await adminPool?.end();
  await pg?.stop();
});

describe('lyra DocStore + Yjs (integration)', () => {
  it('persists updates and a fresh client converges to the same text', async () => {
    const doc = await store.createDoc(ORG_A, USER, 'Notes');

    // Author edits and we persist each update (as the WS server would).
    const author = new Y.Doc();
    author.on('update', (u: Uint8Array) => {
      void store.appendUpdate(ORG_A, doc.id, u);
    });
    author.getText('content').insert(0, 'hello world');
    await new Promise((r) => setTimeout(r, 50)); // let async appends flush

    // A new client rebuilds from storage.
    const reader = buildDoc(await store.loadUpdates(ORG_A, doc.id));
    expect(docText(reader)).toBe('hello world');
  });

  it('merges concurrent edits (CRDT convergence)', async () => {
    const doc = await store.createDoc(ORG_A, USER, 'Concurrent');
    const a = new Y.Doc();
    const b = new Y.Doc();
    a.getText('content').insert(0, 'AAA');
    b.getText('content').insert(0, 'BBB');
    // exchange updates both ways, persist
    const ua = Y.encodeStateAsUpdate(a);
    const ub = Y.encodeStateAsUpdate(b);
    await store.appendUpdate(ORG_A, doc.id, ua);
    await store.appendUpdate(ORG_A, doc.id, ub);

    const merged = buildDoc(await store.loadUpdates(ORG_A, doc.id));
    const text = docText(merged);
    expect(text).toContain('AAA');
    expect(text).toContain('BBB');
    expect(text.length).toBe(6);
  });

  it('cross-tenant: org B cannot load org A doc updates (RLS)', async () => {
    const doc = await store.createDoc(ORG_A, USER, 'Secret');
    const a = new Y.Doc();
    a.getText('content').insert(0, 'classified');
    await store.appendUpdate(ORG_A, doc.id, Y.encodeStateAsUpdate(a));

    expect(await store.loadUpdates(ORG_B, doc.id)).toHaveLength(0);
    expect(await store.getDoc(ORG_B, doc.id)).toBeNull();
  });
});
