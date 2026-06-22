import { describe, it, expect } from 'vitest';
import type { Permission } from '@mams/types';
import { ROLE_PERMISSION_CAP, validatePermissionsForRole } from '@mams/types';

describe('validatePermissionsForRole', () => {
  it('accepts compliant role defaults', () => {
    const r = validatePermissionsForRole('hr.compliance', [
      'read.compliant',
      'approve.leave',
      'read.leave',
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.permissions).toEqual([
      'read.compliant',
      'approve.leave',
      'read.leave',
    ]);
  });

  it('accepts HR request-raiser profile for hr.admin', () => {
    const r = validatePermissionsForRole('hr.admin', ['read.leave', 'write.leave', 'write.regularization']);
    expect(r.ok).toBe(true);
  });

  it('rejects write.leave for compliance role', () => {
    const r = validatePermissionsForRole('hr.compliance', ['read.compliant', 'write.leave']);
    expect(r.ok).toBe(false);
  });

  it('rejects forbidden permission for compliance', () => {
    const r = validatePermissionsForRole('hr.compliance', [
      'read.compliant',
      'manage.org_users',
    ]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toContain('manage.org_users');
  });

  it('dedupes duplicates', () => {
    const r = validatePermissionsForRole('hr.admin', [
      'read.real',
      'read.real',
      'manage.employees',
    ] as Permission[]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.permissions).toEqual(['read.real', 'manage.employees']);
  });

  it('rejects empty set', () => {
    const r = validatePermissionsForRole('hr.admin', []);
    expect(r.ok).toBe(false);
  });
});

describe('ROLE_PERMISSION_CAP', () => {
  it('rejects manage.export_naming for compliance role', () => {
    const r = validatePermissionsForRole('hr.compliance', [
      'read.compliant',
      'manage.export_naming',
    ]);
    expect(r.ok).toBe(false);
  });

  it('rejects manage.export_naming for hr.admin', () => {
    const r = validatePermissionsForRole('hr.admin', ['read.real', 'manage.export_naming']);
    expect(r.ok).toBe(false);
  });

  it('hr.admin cap includes core HR permissions', () => {
    const cap = ROLE_PERMISSION_CAP['hr.admin'];
    const core: Permission[] = [
      'read.real',
      'manage.employees',
      'manage.devices',
      'manage.leave',
      'read.visitors',
      'manage.visitors',
    ];
    for (const p of core) {
      expect(cap).toContain(p);
    }
    expect(cap).not.toContain('manage.org_users');
  });

  it('org.admin cap includes governance permissions', () => {
    const cap = ROLE_PERMISSION_CAP['org.admin'];
    expect(cap).toContain('manage.org_users');
    expect(cap).toContain('manage.org_settings');
    expect(cap).toContain('read.org_audit');
  });
});
