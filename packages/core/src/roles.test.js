import { describe, expect, it } from 'vitest';
import { hasPermission, PERMISSION, ROLE } from './roles.js';

describe('hasPermission', () => {
  it('allows owner all permissions', () => {
    expect(hasPermission(ROLE.OWNER, PERMISSION.ORG_MANAGE)).toBe(true);
  });

  it('blocks user org management', () => {
    expect(hasPermission(ROLE.USER, PERMISSION.ORG_MANAGE)).toBe(false);
  });
});
