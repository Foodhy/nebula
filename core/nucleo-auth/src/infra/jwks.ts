import { verifyJwt } from '@nebula/security';
import { createRemoteJWKSet } from 'jose';
import type { TokenVerifier } from '../application/verifier.js';

export interface RemoteVerifierConfig {
  /** OIDC issuer URL, e.g. http://localhost:8080/realms/nebula */
  issuer: string;
  /** Expected audience, e.g. "nebula" */
  audience: string;
  /** JWKS endpoint. Defaults to Keycloak's `${issuer}/protocol/openid-connect/certs`. */
  jwksUri?: string;
}

/**
 * Build a TokenVerifier backed by a remote JWKS (Keycloak). Validates signature,
 * issuer, audience, expiry, and claim shape via @nebula/security verifyJwt.
 */
export function createRemoteVerifier(cfg: RemoteVerifierConfig): TokenVerifier {
  const jwksUri = cfg.jwksUri ?? `${cfg.issuer}/protocol/openid-connect/certs`;
  const jwks = createRemoteJWKSet(new URL(jwksUri));
  return (token: string) => verifyJwt(token, jwks, { issuer: cfg.issuer, audience: cfg.audience });
}
