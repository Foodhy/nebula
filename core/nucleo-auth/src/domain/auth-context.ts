import type { JwtClaims, OrgId, Role, UserId } from '@nebula/types';

/**
 * The authenticated principal for a request. Derived ONLY from a validated JWT.
 * org_id/userId here are authoritative — never overwrite from request body/headers.
 * See CLAUDE.md hard rule #2 and docs/04-security.md.
 */
export interface AuthContext {
  userId: UserId;
  orgId: OrgId;
  roles: Role[];
  scopes: string[];
}

/** Map validated JWT claims to the request AuthContext. */
export function toAuthContext(claims: JwtClaims): AuthContext {
  return {
    userId: claims.sub,
    orgId: claims.org_id,
    roles: claims.roles,
    scopes: claims.scopes,
  };
}
