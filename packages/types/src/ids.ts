import { z } from 'zod';

/**
 * Branded ID types. UUIDs validated at the boundary with Zod, then carried
 * as branded strings so an OrgId can never be passed where a UserId is expected.
 */
export const OrgId = z.string().uuid().brand<'OrgId'>();
export type OrgId = z.infer<typeof OrgId>;

export const UserId = z.string().uuid().brand<'UserId'>();
export type UserId = z.infer<typeof UserId>;
