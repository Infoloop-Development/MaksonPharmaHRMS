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
