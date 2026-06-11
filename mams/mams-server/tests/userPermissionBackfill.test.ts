import { describe, expect, it } from 'vitest';
import { PERMISSIONS_BY_ROLE } from '@mams/types';

describe('PERMISSIONS_BY_ROLE leave', () => {
  it('hr.compliance includes approve.leave but not write.leave', () => {
    const perms = PERMISSIONS_BY_ROLE['hr.compliance'];
    expect(perms).toContain('approve.leave');
    expect(perms).not.toContain('write.leave');
    expect(perms).not.toContain('manage.leave');
  });
});

describe('PERMISSIONS_BY_ROLE regularization', () => {
  it('hr.admin includes write and approve regularization', () => {
    const perms = PERMISSIONS_BY_ROLE['hr.admin'];
    expect(perms).toContain('write.regularization');
    expect(perms).toContain('approve.regularization');
  });

  it('hr.compliance includes approve regularization only', () => {
    const perms = PERMISSIONS_BY_ROLE['hr.compliance'];
    expect(perms).not.toContain('write.regularization');
    expect(perms).toContain('approve.regularization');
  });
});
