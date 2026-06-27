import { verifyJwt } from '@nebula/security';
import type { JwtClaims } from '@nebula/types';
import { UnauthorizedException } from '@nestjs/common';
import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import type { TokenVerifier } from '../application/verifier.js';
import type { AuthContext } from '../domain/auth-context.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

const SECRET = new TextEncoder().encode('test-secret-at-least-32-bytes-long!!');
const ISSUER = 'http://localhost:8080/realms/nebula';
const AUDIENCE = 'nebula';
const TOKEN_ORG = '00000000-0000-0000-0000-00000000000a';
const FORGED_ORG = '00000000-0000-0000-0000-00000000000b';
const SUB = '00000000-0000-0000-0000-000000000002';

const verifier: TokenVerifier = (token: string): Promise<JwtClaims> =>
  verifyJwt(token, SECRET, { issuer: ISSUER, audience: AUDIENCE });

function sign(claims: Record<string, unknown>) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime('1h')
    .sign(SECRET);
}

/** Minimal ExecutionContext stub exposing a fake HTTP request. */
function ctxWith(req: unknown) {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    // biome-ignore lint/suspicious/noExplicitAny: test stub for Nest ExecutionContext
  } as any;
}

describe('JwtAuthGuard', () => {
  it('accepts a valid token and attaches AuthContext from claims', async () => {
    const token = await sign({ sub: SUB, org_id: TOKEN_ORG, roles: ['member'] });
    const req: { headers: { authorization: string }; authContext?: AuthContext } = {
      headers: { authorization: `Bearer ${token}` },
    };
    const guard = new JwtAuthGuard(verifier);

    await expect(guard.canActivate(ctxWith(req))).resolves.toBe(true);
    expect(req.authContext?.orgId).toBe(TOKEN_ORG);
    expect(req.authContext?.userId).toBe(SUB);
    expect(req.authContext?.roles).toEqual(['member']);
  });

  it('IGNORES a forged org_id in the request body (uses the JWT org_id)', async () => {
    const token = await sign({ sub: SUB, org_id: TOKEN_ORG });
    const req: {
      headers: { authorization: string };
      body: { org_id: string };
      authContext?: AuthContext;
    } = {
      headers: { authorization: `Bearer ${token}` },
      body: { org_id: FORGED_ORG },
    };
    const guard = new JwtAuthGuard(verifier);

    await guard.canActivate(ctxWith(req));
    expect(req.authContext?.orgId).toBe(TOKEN_ORG);
    expect(req.authContext?.orgId).not.toBe(FORGED_ORG);
  });

  it('rejects a missing token', async () => {
    const guard = new JwtAuthGuard(verifier);
    await expect(guard.canActivate(ctxWith({ headers: {} }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a token signed with a different key', async () => {
    const wrong = new SignJWT({ sub: SUB, org_id: TOKEN_ORG })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setExpirationTime('1h');
    const token = await wrong.sign(new TextEncoder().encode('another-secret-32-bytes-long-aaaa'));
    const guard = new JwtAuthGuard(verifier);
    await expect(
      guard.canActivate(ctxWith({ headers: { authorization: `Bearer ${token}` } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
