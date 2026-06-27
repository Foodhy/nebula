import { z } from 'zod';
import { OrgId, UserId } from './ids.js';
import { Role } from './permissions.js';

/**
 * Validated Nébula JWT claims. `org_id` and `sub` are ALWAYS taken from here,
 * never from the request body/headers. See docs/services/atlas.md.
 */
export const JwtClaims = z.object({
  sub: UserId,
  org_id: OrgId,
  // Keycloak emits all realm roles (incl. system roles like offline_access).
  // Keep only the Nébula org roles; ignore the rest.
  roles: z
    .array(z.string())
    .default([])
    .transform((arr) => arr.filter((r): r is Role => (Role.options as string[]).includes(r))),
  scopes: z.array(z.string()).default([]),
  exp: z.number().int().positive(),
});
export type JwtClaims = z.infer<typeof JwtClaims>;
