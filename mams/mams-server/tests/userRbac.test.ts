import { describe, it, expect } from 'vitest';
import type { Permission } from '@mams/types';
import { ROLE_PERMISSION_CAP, validatePermissionsForRole } from '@mams/types';

describe('validatePermissionsForRole', () => {
  it('accepts compliant role defaults', () => {
    const r = validatePermissionsForRole('hr.compliance', ['read.compliant', 'approve.adjust']);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.permissions).toEqual(['read.compliant', 'approve.adjust']);
  });

  it('rejects forbidden permission for compliance', () => {
    const r = validatePermissionsForRole('hr.compliance', [
      'read.compliant',
      'approve.adjust',
      'manage.users',
    ]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toContain('manage.users');
  });

  it('dedupes duplicates', () => {
    const r = validatePermissionsForRole('hr.admin', [
      'read.real',
      'read.real',
      'manage.settings',
    ] as Permission[]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.permissions).toEqual(['read.real', 'manage.settings']);
  });

  it('rejects empty set', () => {
    const r = validatePermissionsForRole('hr.admin', []);
    expect(r.ok).toBe(false);
  });
});

describe('ROLE_PERMISSION_CAP', () => {
  it('hr.admin cap includes all Permission enum values', () => {
    const cap = ROLE_PERMISSION_CAP['hr.admin'];
    const all: Permission[] = [
      'read.real',
      'read.compliant',
      'write.adjust',
      'approve.adjust',
      'unmask.sensitive',
      'manage.users',
      'manage.devices',
      'manage.settings',
    ];
    for (const p of all) {
      expect(cap).toContain(p);
    }
  });
});
