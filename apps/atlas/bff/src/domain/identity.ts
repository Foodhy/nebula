import type { Role } from '@nebula/types';

/** OAuth2 token set returned by Keycloak. */
export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

/** Result of creating an organization with its first (owner) user. */
export interface OrgWithOwner {
  orgId: string;
  userId: string;
}

/** A member of an organization. */
export interface Member {
  userId: string;
  username: string;
  email: string | null;
  roles: Role[];
}

export interface RegisterInput {
  orgName: string;
  username: string;
  email: string;
  password: string;
}

export interface InviteInput {
  orgId: string;
  email: string;
  username: string;
  role: Role;
  /** Temporary password the invitee must change on first login. */
  temporaryPassword: string;
}
