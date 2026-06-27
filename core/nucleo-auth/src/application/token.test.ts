import { describe, expect, it } from 'vitest';
import { extractBearerToken } from './token.js';

describe('extractBearerToken', () => {
  it('extracts a valid bearer token (case-insensitive scheme)', () => {
    expect(extractBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(extractBearerToken('bearer xyz')).toBe('xyz');
  });

  it('returns null for missing/malformed headers', () => {
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken('')).toBeNull();
    expect(extractBearerToken('Basic abc')).toBeNull();
    expect(extractBearerToken('Bearer')).toBeNull();
    expect(extractBearerToken('Bearer a b')).toBeNull();
  });
});
