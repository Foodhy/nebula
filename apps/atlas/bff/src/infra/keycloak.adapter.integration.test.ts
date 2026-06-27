import { createRemoteVerifier } from '@nebula/nucleo-auth';
import { CrossTenantAccessError, assertOrgAccess } from '@nebula/security';
import { decodeJwt } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KeycloakHttpAdapter } from './keycloak.adapter.js';

// Runs against the live dev Keycloak (infra/compose deps stack).
const BASE_URL = process.env.KEYCLOAK_BASE_URL ?? 'http://localhost:8080';
const REALM = 'nebula';

const adapter = new KeycloakHttpAdapter({
  baseUrl: BASE_URL,
  realm: REALM,
  clientId: 'nebula-apps',
  clientSecret: 'changeme',
});

const verify = createRemoteVerifier({
  issuer: `${BASE_URL}/realms/${REALM}`,
  audience: 'nebula-apps',
});

// Unique suffix per run (Date.now is fine in test code).
const suffix = `${Date.now()}`;
const PASSWORD = 'sup3r-secret-pw';

let orgA: { orgId: string; userId: string };
let orgB: { orgId: string; userId: string };
const userA = `owner-a-${suffix}`;
const userB = `owner-b-${suffix}`;

let keycloakUp = false;

beforeAll(async () => {
  try {
    const res = await fetch(`${BASE_URL}/realms/${REALM}/.well-known/openid-configuration`);
    keycloakUp = res.ok;
  } catch {
    keycloakUp = false;
  }
  if (!keycloakUp) return;

  orgA = await adapter.registerOrgWithOwner({
    orgName: `acme-${suffix}`,
    username: userA,
    email: `${userA}@example.com`,
    password: PASSWORD,
  });
  orgB = await adapter.registerOrgWithOwner({
    orgName: `globex-${suffix}`,
    username: userB,
    email: `${userB}@example.com`,
    password: PASSWORD,
  });
}, 60_000);

afterAll(() => {
  // Dev realm is ephemeral; users left in place (cheap). Realm is re-imported on reset.
});

describe('Atlas / Keycloak identity (integration)', () => {
  it('skips gracefully if Keycloak is not running', () => {
    if (!keycloakUp) {
      console.warn('[atlas] Keycloak not reachable — start infra/compose deps to run this suite');
    }
    expect(true).toBe(true);
  });

  it('creates two distinct organizations', () => {
    if (!keycloakUp) return;
    expect(orgA.orgId).toBeTruthy();
    expect(orgB.orgId).toBeTruthy();
    expect(orgA.orgId).not.toBe(orgB.orgId);
  });

  it('login returns a JWT whose org_id matches the user org (from the token, not client)', async () => {
    if (!keycloakUp) return;
    const tokens = await adapter.login(userA, PASSWORD);
    const claims = decodeJwt(tokens.accessToken) as { org_id?: string; roles?: string[] };
    expect(claims.org_id).toBe(orgA.orgId);
    expect(claims.roles).toContain('owner');
  });

  it('verifyJwt (remote JWKS + audience) accepts the token and yields typed org_id', async () => {
    if (!keycloakUp) return;
    const tokens = await adapter.login(userB, PASSWORD);
    const claims = await verify(tokens.accessToken);
    expect(claims.org_id).toBe(orgB.orgId);
    expect(claims.sub).toBeTruthy();
  });

  it('cross-tenant: org A token cannot act on org B (assertOrgAccess)', async () => {
    if (!keycloakUp) return;
    const tokens = await adapter.login(userA, PASSWORD);
    const claims = await verify(tokens.accessToken);
    expect(() => assertOrgAccess(claims.org_id, orgB.orgId)).toThrow(CrossTenantAccessError);
    expect(() => assertOrgAccess(claims.org_id, orgA.orgId)).not.toThrow();
  });

  it('lists members of an org (scoped)', async () => {
    if (!keycloakUp) return;
    const members = await adapter.listMembers(orgA.orgId);
    expect(members.some((m) => m.username === userA)).toBe(true);
    expect(members.some((m) => m.username === userB)).toBe(false);
  });
});
