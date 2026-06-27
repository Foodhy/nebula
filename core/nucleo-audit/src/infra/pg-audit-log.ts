import type { Pool } from 'pg';
import type { AuditLog } from '../application/audit-log.js';
import type { AuditEntry, NewAuditEntry } from '../domain/audit-entry.js';

interface AuditRow {
  id: string;
  org_id: string;
  actor_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
}

function toEntry(row: AuditRow): AuditEntry {
  return {
    id: row.id,
    orgId: row.org_id,
    actorId: row.actor_id,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

/** Postgres-backed append-only audit log. Immutability also enforced by a DB trigger. */
export class PgAuditLog implements AuditLog {
  constructor(private readonly pool: Pool) {}

  async append(entry: NewAuditEntry): Promise<AuditEntry> {
    const res = await this.pool.query<AuditRow>(
      `INSERT INTO audit_log (org_id, actor_id, action, resource_type, resource_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        entry.orgId,
        entry.actorId ?? null,
        entry.action,
        entry.resourceType ?? null,
        entry.resourceId ?? null,
        entry.metadata ?? {},
      ],
    );
    // INSERT ... RETURNING always yields exactly one row.
    return toEntry(res.rows[0] as AuditRow);
  }

  async list(orgId: string, limit = 100): Promise<AuditEntry[]> {
    const res = await this.pool.query<AuditRow>(
      'SELECT * FROM audit_log WHERE org_id = $1 ORDER BY created_at DESC LIMIT $2',
      [orgId, limit],
    );
    return res.rows.map(toEntry);
  }
}
