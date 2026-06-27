import type { KeyProvider } from '../application/ports/key-provider.port.js';

/**
 * F1 KeyProvider: bucket-per-org, single MinIO KMS key. The interface lets a
 * Vault-backed per-org-key implementation replace this later without changes.
 */
export class EnvKeyProvider implements KeyProvider {
  constructor(private readonly keyName: string) {}

  bucketFor(orgId: string): string {
    return `org-${orgId}`.toLowerCase();
  }

  kmsKeyName(_orgId: string): string {
    return this.keyName;
  }
}
