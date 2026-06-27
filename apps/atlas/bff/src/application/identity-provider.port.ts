import type {
  InviteInput,
  Member,
  OrgWithOwner,
  RegisterInput,
  Tokens,
} from '../domain/identity.js';

/**
 * Port for the identity provider. Keycloak is the only implementation today
 * (KeycloakHttpAdapter), but apps speak this interface so the IdP stays swappable
 * (ADR-0004 exit plan). Nothing here exposes Keycloak specifics.
 */
export interface IdentityProvider {
  /** Create an org (Keycloak group) + its owner user. Returns ids. */
  registerOrgWithOwner(input: RegisterInput): Promise<OrgWithOwner>;
  /** Resource-owner password login → tokens. */
  login(username: string, password: string): Promise<Tokens>;
  /** Exchange a refresh token for a fresh token set. */
  refresh(refreshToken: string): Promise<Tokens>;
  /** Create a user in an existing org with a role. Returns the new user id. */
  invite(input: InviteInput): Promise<string>;
  /** List members of an org. */
  listMembers(orgId: string): Promise<Member[]>;
  /** Require the user to set up TOTP MFA at next login (CONFIGURE_TOTP). */
  enrollMfa(userId: string): Promise<void>;
}

export const IDENTITY_PROVIDER = Symbol('NEBULA_IDENTITY_PROVIDER');
