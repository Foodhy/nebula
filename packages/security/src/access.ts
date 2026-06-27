/**
 * Raised when a request tries to touch a resource belonging to another org.
 * The org_id used here MUST come from the validated JWT, never the client.
 * See docs/04-security.md (multi-tenant isolation) and CLAUDE.md hard rule #2.
 */
export class CrossTenantAccessError extends Error {
  constructor(jwtOrgId: string, resourceOrgId: string) {
    super(`Cross-tenant access denied: token org ${jwtOrgId} != resource org ${resourceOrgId}`);
    this.name = 'CrossTenantAccessError';
  }
}

/**
 * Guard: the JWT's org_id must match the resource's org_id.
 * Throws CrossTenantAccessError on mismatch (or empty input). Returns void on ok.
 */
export function assertOrgAccess(jwtOrgId: string, resourceOrgId: string): void {
  if (!jwtOrgId || !resourceOrgId || jwtOrgId !== resourceOrgId) {
    throw new CrossTenantAccessError(jwtOrgId, resourceOrgId);
  }
}
