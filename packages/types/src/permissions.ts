import { z } from 'zod';

/**
 * Resource-level permission (ABAC) — what a grantee can do with a file/folder.
 * Decided by nucleo-policy, not by Atlas. See docs/04-security.md.
 */
export const Permission = z.enum(['viewer', 'commenter', 'editor', 'owner']);
export type Permission = z.infer<typeof Permission>;

/**
 * Organization-level role (RBAC) carried in the JWT. See docs/services/atlas.md.
 */
export const Role = z.enum(['owner', 'admin', 'member', 'guest']);
export type Role = z.infer<typeof Role>;
