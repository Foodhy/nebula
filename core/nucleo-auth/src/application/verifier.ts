import type { JwtClaims } from '@nebula/types';

/** Verifies a raw JWT and returns typed claims, or throws if invalid. */
export type TokenVerifier = (token: string) => Promise<JwtClaims>;

/** DI token for the configured TokenVerifier. */
export const AUTH_VERIFIER = Symbol('NEBULA_AUTH_VERIFIER');
