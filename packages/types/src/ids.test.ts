import { describe, expect, it } from 'vitest';
import { OrgId, UserId } from './ids.js';
import { JwtClaims } from './jwt.js';

describe('id schemas', () => {
  it('accepts valid uuids', () => {
    expect(OrgId.parse('00000000-0000-0000-0000-000000000001')).toBeDefined();
    expect(UserId.parse('00000000-0000-0000-0000-000000000002')).toBeDefined();
  });

  it('rejects non-uuid strings', () => {
    expect(() => OrgId.parse('not-a-uuid')).toThrow();
    expect(() => UserId.parse('')).toThrow();
  });
});

describe('JwtClaims', () => {
  it('parses a full claim set and defaults roles/scopes', () => {
    const claims = JwtClaims.parse({
      sub: '00000000-0000-0000-0000-000000000002',
      org_id: '00000000-0000-0000-0000-000000000001',
      exp: 1700000000,
    });
    expect(claims.roles).toEqual([]);
    expect(claims.scopes).toEqual([]);
  });

  it('rejects an invalid org_id', () => {
    expect(() =>
      JwtClaims.parse({
        sub: '00000000-0000-0000-0000-000000000002',
        org_id: 'nope',
        exp: 1700000000,
      }),
    ).toThrow();
  });
});
