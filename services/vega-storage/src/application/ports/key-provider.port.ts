/**
 * Per-organization encryption/key strategy. F1: one MinIO KMS key, bucket-per-org.
 * Later (Vault): a distinct data key per org (envelope) — same interface.
 */
export interface KeyProvider {
  /** Bucket name for an org's objects, e.g. org-<uuid>. */
  bucketFor(orgId: string): string;
  /** KMS key name used for SSE-S3 on this org's bucket. */
  kmsKeyName(orgId: string): string;
}

export const KEY_PROVIDER = Symbol('VEGA_KEY_PROVIDER');
