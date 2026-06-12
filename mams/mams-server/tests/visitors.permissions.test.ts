import { describe, expect, it } from 'vitest';
import type { Permission } from '@mams/types';
import {
  canApproveVisitors,
  canManageVisitorForms,
  canViewVisitors,
  validatePermissionsForRole,
} from '@mams/types';

describe('visitor permission helpers', () => {
  it('read.visitors grants view only', () => {
    const perms: Permission[] = ['read.visitors'];
    expect(canViewVisitors(perms)).toBe(true);
    expect(canApproveVisitors(perms)).toBe(false);
    expect(canManageVisitorForms(perms)).toBe(false);
  });

  it('approve.visitors grants approve and view', () => {
    const perms: Permission[] = ['approve.visitors'];
    expect(canViewVisitors(perms)).toBe(true);
    expect(canApproveVisitors(perms)).toBe(true);
    expect(canManageVisitorForms(perms)).toBe(false);
  });

  it('manage.visitors grants all visitor capabilities', () => {
    const perms: Permission[] = ['manage.visitors'];
    expect(canViewVisitors(perms)).toBe(true);
    expect(canApproveVisitors(perms)).toBe(true);
    expect(canManageVisitorForms(perms)).toBe(true);
  });
});

describe('visitor RBAC caps', () => {
  it('hr.compliance can have read and approve but not manage', () => {
    const r = validatePermissionsForRole('hr.compliance', ['read.visitors', 'approve.visitors']);
    expect(r.ok).toBe(true);
    const bad = validatePermissionsForRole('hr.compliance', ['manage.visitors']);
    expect(bad.ok).toBe(false);
  });

  it('hr.admin can have manage.visitors', () => {
    const r = validatePermissionsForRole('hr.admin', ['read.visitors', 'approve.visitors', 'manage.visitors']);
    expect(r.ok).toBe(true);
  });
});
