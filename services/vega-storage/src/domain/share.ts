import type { Permission } from '@nebula/types';

export type ResourceType = 'file' | 'folder';
export type GranteeType = 'user' | 'link' | 'org';

export interface ShareEntity {
  id: string;
  orgId: string;
  resourceId: string;
  resourceType: ResourceType;
  granteeType: GranteeType;
  granteeId: string | null;
  permission: Permission;
  expiresAt: Date | null;
}

/** Permission strength ordering (higher = more capable). */
const RANK: Record<Permission, number> = {
  viewer: 1,
  commenter: 2,
  editor: 3,
  owner: 4,
};

export function permissionRank(p: Permission): number {
  return RANK[p];
}

/** True if `held` permission satisfies the `required` level. */
export function satisfies(held: Permission, required: Permission): boolean {
  return RANK[held] >= RANK[required];
}

export function canView(p: Permission): boolean {
  return satisfies(p, 'viewer');
}
export function canEdit(p: Permission): boolean {
  return satisfies(p, 'editor');
}
