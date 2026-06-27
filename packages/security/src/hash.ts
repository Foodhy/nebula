import { hash, verify } from '@node-rs/argon2';

/** @node-rs/argon2 Algorithm enum value for Argon2id (referenced by value to
 * stay compatible with `isolatedModules`, which forbids const-enum access). */
const ARGON2ID = 2;

/**
 * Argon2id parameters. Meet docs/04-security.md minimums:
 * memory >= 19 MiB, iterations >= 2, parallelism per CPU.
 * NOTE: real user-password hashing lives in Atlas/Keycloak — apps never see
 * passwords. These wrappers exist for the rare service-side secret hashing.
 */
const ARGON2_OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19_456, // KiB (= 19 MiB)
  timeCost: 3,
  parallelism: 1,
} as const;

/** Hash a secret with Argon2id. Output is an encoded string incl. salt + params. */
export function hashSecret(plaintext: string): Promise<string> {
  return hash(plaintext, ARGON2_OPTIONS);
}

/** Verify a plaintext against an Argon2id hash. Never logs the plaintext. */
export function verifySecret(encodedHash: string, plaintext: string): Promise<boolean> {
  return verify(encodedHash, plaintext);
}
