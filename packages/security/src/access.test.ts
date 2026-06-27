import { describe, expect, it } from 'vitest';
import { CrossTenantAccessError, assertOrgAccess } from './access.js';

const ORG_A = '00000000-0000-0000-0000-00000000000a';
const ORG_B = '00000000-0000-0000-0000-00000000000b';

describe('assertOrgAccess', () => {
  it('allows access when token org matches resource org', () => {
    expect(() => assertOrgAccess(ORG_A, ORG_A)).not.toThrow();
  });

  it('rejects a wrong org_id (cross-tenant)', () => {
    expect(() => assertOrgAccess(ORG_A, ORG_B)).toThrow(CrossTenantAccessError);
  });

  it('rejects empty token org', () => {
    expect(() => assertOrgAccess('', ORG_A)).toThrow(CrossTenantAccessError);
  });

  it('rejects empty resource org', () => {
    expect(() => assertOrgAccess(ORG_A, '')).toThrow(CrossTenantAccessError);
  });
});
