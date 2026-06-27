import { describe, expect, it } from 'vitest';
import { nextVersionNo, objectKeyFor } from './file.js';
import { canEdit, canView, permissionRank, satisfies } from './share.js';

describe('file domain', () => {
  it('nextVersionNo increments (0 when none)', () => {
    expect(nextVersionNo(null)).toBe(1);
    expect(nextVersionNo(3)).toBe(4);
  });

  it('objectKeyFor is deterministic per version', () => {
    expect(objectKeyFor('abc', 2)).toBe('files/abc/v2');
  });
});

describe('share permissions', () => {
  it('ranks permissions', () => {
    expect(permissionRank('owner')).toBeGreaterThan(permissionRank('editor'));
    expect(permissionRank('editor')).toBeGreaterThan(permissionRank('viewer'));
  });

  it('satisfies / canView / canEdit', () => {
    expect(satisfies('owner', 'editor')).toBe(true);
    expect(satisfies('viewer', 'editor')).toBe(false);
    expect(canView('viewer')).toBe(true);
    expect(canEdit('viewer')).toBe(false);
    expect(canEdit('editor')).toBe(true);
  });
});
