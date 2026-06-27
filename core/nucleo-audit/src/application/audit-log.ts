import type { AuditEntry, NewAuditEntry } from '../domain/audit-entry.js';

/**
 * Append-only audit log port. No update/delete by design — the log is immutable.
 */
export interface AuditLog {
  append(entry: NewAuditEntry): Promise<AuditEntry>;
  /** List the most recent entries for an org (newest first). */
  list(orgId: string, limit?: number): Promise<AuditEntry[]>;
}
