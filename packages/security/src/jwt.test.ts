import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { verifyJwt } from './jwt.js';

const SECRET = new TextEncoder().encode('test-secret-at-least-32-bytes-long!!');
const ISSUER = 'http://localhost:8080/realms/nebula';
const AUDIENCE = 'nebula';
const ORG = '00000000-0000-0000-0000-00000000000a';
const SUB = '00000000-0000-0000-0000-000000000002';

function sign(claims: Record<string, unknown>, overrides?: { issuer?: string; audience?: string }) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(overrides?.issuer ?? ISSUER)
    .setAudience(overrides?.audience ?? AUDIENCE)
    .setExpirationTime('1h')
    .sign(SECRET);
}

describe('verifyJwt', () => {
  it('verifies a valid token and returns typed claims', async () => {
    const token = await sign({ sub: SUB, org_id: ORG, roles: ['member'], scopes: ['vega:read'] });
    const claims = await verifyJwt(token, SECRET, { issuer: ISSUER, audience: AUDIENCE });
    expect(claims.org_id).toBe(ORG);
    expect(claims.sub).toBe(SUB);
    expect(claims.roles).toEqual(['member']);
  });

  it('rejects a token signed with a different key', async () => {
    const token = await sign({ sub: SUB, org_id: ORG });
    const wrongKey = new TextEncoder().encode('another-secret-at-least-32-bytes-long');
    await expect(
      verifyJwt(token, wrongKey, { issuer: ISSUER, audience: AUDIENCE }),
    ).rejects.toThrow();
  });

  it('rejects a token with the wrong issuer', async () => {
    const token = await sign({ sub: SUB, org_id: ORG }, { issuer: 'http://evil.example' });
    await expect(
      verifyJwt(token, SECRET, { issuer: ISSUER, audience: AUDIENCE }),
    ).rejects.toThrow();
  });

  it('rejects a token whose org_id is not a uuid (claim-shape validation)', async () => {
    const token = await sign({ sub: SUB, org_id: 'not-a-uuid' });
    await expect(
      verifyJwt(token, SECRET, { issuer: ISSUER, audience: AUDIENCE }),
    ).rejects.toThrow();
  });
});
