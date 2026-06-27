import { JwtClaims } from '@nebula/types';
import { type JWTVerifyGetKey, type KeyLike, jwtVerify } from 'jose';

export interface VerifyOptions {
  issuer: string;
  audience: string;
}

/**
 * Key material accepted by verifyJwt:
 * - a remote JWKS resolver (createRemoteJWKSet) for Keycloak-issued RS256 tokens,
 * - a KeyLike public key, or
 * - a Uint8Array symmetric secret (mainly for tests).
 */
export type VerifyKey = JWTVerifyGetKey | KeyLike | Uint8Array;

/**
 * Verify a JWT signature + issuer/audience, then validate the claim shape with
 * @nebula/types. Returns typed JwtClaims. org_id/sub come ONLY from here.
 * Throws if the signature, issuer, audience, expiry, or claim shape is invalid.
 */
export async function verifyJwt(
  token: string,
  key: VerifyKey,
  opts: VerifyOptions,
): Promise<JwtClaims> {
  const { payload } = await jwtVerify(token, key as JWTVerifyGetKey, {
    issuer: opts.issuer,
    audience: opts.audience,
  });
  return JwtClaims.parse(payload);
}
