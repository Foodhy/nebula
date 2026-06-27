import { describe, expect, it } from 'vitest';
import { hashSecret, verifySecret } from './hash.js';

describe('Argon2id hashing', () => {
  it('produces an Argon2id encoded hash, not plaintext', async () => {
    const secret = 'correct horse battery staple';
    const encoded = await hashSecret(secret);
    expect(encoded.startsWith('$argon2id$')).toBe(true);
    expect(encoded).not.toContain(secret);
  });

  it('verifies a correct secret', async () => {
    const encoded = await hashSecret('s3cret');
    expect(await verifySecret(encoded, 's3cret')).toBe(true);
  });

  it('rejects a wrong secret', async () => {
    const encoded = await hashSecret('s3cret');
    expect(await verifySecret(encoded, 'wrong')).toBe(false);
  });

  it('produces distinct hashes for the same input (random salt)', async () => {
    const a = await hashSecret('same');
    const b = await hashSecret('same');
    expect(a).not.toBe(b);
  });
});
