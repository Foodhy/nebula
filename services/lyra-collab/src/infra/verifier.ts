import { verifyJwt } from '@nebula/security';
import type { JwtClaims } from '@nebula/types';
import { createRemoteJWKSet } from 'jose';

export type Verifier = (token: string) => Promise<JwtClaims>;

/** JWT verifier backed by Keycloak's remote JWKS. */
export function makeVerifier(issuer: string, audience: string): Verifier {
  const jwks = createRemoteJWKSet(new URL(`${issuer}/protocol/openid-connect/certs`));
  return (token: string) => verifyJwt(token, jwks, { issuer, audience });
}
