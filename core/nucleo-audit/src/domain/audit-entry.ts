/**
 * An immutable audit record: who did what, to which resource, in which org, when.
 * Created via AuditLog.append — there is intentionally no update/delete.
 */
export interface AuditEntry {
  id: string;
  orgId: string;
  actorId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

/** Input to append a new audit entry. org_id/actor come from the JWT context. */
export interface NewAuditEntry {
  orgId: string;
  actorId?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}
