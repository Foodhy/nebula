import { describe, expect, it } from 'vitest';
import { AT_COOKIE, cookieOptions, decodeJwt } from './index.js';

describe('bff-kit', () => {
  it('decodes a JWT payload', () => {
    const payload = { sub: 'u1', org_id: 'o1' };
    const token = `h.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.s`;
    expect(decodeJwt(token)).toMatchObject(payload);
  });

  it('returns null for garbage', () => {
    expect(decodeJwt('not-a-jwt')).toBeNull();
  });

  it('cookieOptions honors secure flag', () => {
    expect(cookieOptions(true).secure).toBe(true);
    expect(cookieOptions(false).httpOnly).toBe(true);
    expect(AT_COOKIE).toBe('nebula_at');
  });
});
