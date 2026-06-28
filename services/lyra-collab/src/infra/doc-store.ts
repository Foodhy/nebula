import { withTenant } from '@nebula/db';
import type { Pool, PoolClient } from 'pg';
import type { LyraDoc } from '../domain/doc.js';

interface DocRow {
  id: string;
  org_id: string;
  owner_id: string;
  title: string;
  vega_file_id: string | null;
  created_at: Date;
  updated_at: Date;
}
const toDoc = (r: DocRow): LyraDoc => ({
  id: r.id,
  orgId: r.org_id,
  ownerId: r.owner_id,
  title: r.title,
  vegaFileId: r.vega_file_id,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/**
 * Postgres-backed document + Yjs update log. All access is org-scoped via
 * withTenant (RLS active): a doc and its updates are invisible to other orgs.
 */
export class DocStore {
  constructor(private readonly pool: Pool) {}

  private run<T>(orgId: string, fn: (c: PoolClient) => Promise<T>): Promise<T> {
    return withTenant(this.pool, orgId, fn);
  }

  createDoc(orgId: string, ownerId: string, title: string): Promise<LyraDoc> {
    return this.run(orgId, async (c) => {
      const { rows } = await c.query<DocRow>(
        'INSERT INTO lyra_docs (org_id, owner_id, title) VALUES ($1,$2,$3) RETURNING *',
        [orgId, ownerId, title],
      );
      return toDoc(rows[0] as DocRow);
    });
  }

  getDoc(orgId: string, id: string): Promise<LyraDoc | null> {
    return this.run(orgId, async (c) => {
      const { rows } = await c.query<DocRow>('SELECT * FROM lyra_docs WHERE id = $1', [id]);
      return rows[0] ? toDoc(rows[0]) : null;
    });
  }

  setVegaFile(orgId: string, id: string, vegaFileId: string): Promise<void> {
    return this.run(orgId, async (c) => {
      await c.query('UPDATE lyra_docs SET vega_file_id = $1, updated_at = now() WHERE id = $2', [
        vegaFileId,
        id,
      ]);
    });
  }

  appendUpdate(orgId: string, docId: string, update: Uint8Array): Promise<void> {
    return this.run(orgId, async (c) => {
      await c.query('INSERT INTO lyra_updates (doc_id, org_id, update) VALUES ($1,$2,$3)', [
        docId,
        orgId,
        Buffer.from(update),
      ]);
      await c.query('UPDATE lyra_docs SET updated_at = now() WHERE id = $1', [docId]);
    });
  }

  /** All stored Yjs updates for a doc, oldest first. */
  loadUpdates(orgId: string, docId: string): Promise<Uint8Array[]> {
    return this.run(orgId, async (c) => {
      const { rows } = await c.query<{ update: Buffer }>(
        'SELECT update FROM lyra_updates WHERE doc_id = $1 ORDER BY id ASC',
        [docId],
      );
      return rows.map((r) => new Uint8Array(r.update));
    });
  }
}
