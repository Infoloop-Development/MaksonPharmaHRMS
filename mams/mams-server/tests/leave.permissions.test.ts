import { describe, expect, it } from 'vitest';
import type { Permission } from '@mams/types';
import {
  canApproveLeave,
  canConfigureLeave,
  canViewLeave,
  canWriteLeave,
  resolveLeaveAdminApply,
} from '@mams/types';

describe('leave permission helpers', () => {
  it('write.leave grants submit but not approve or configure', () => {
    const perms: Permission[] = ['read.leave', 'write.leave'];
    expect(canViewLeave(perms)).toBe(true);
    expect(canWriteLeave(perms)).toBe(true);
    expect(canApproveLeave(perms)).toBe(false);
    expect(canConfigureLeave(perms)).toBe(false);
  });

  it('approve.leave grants approve but not submit', () => {
    const perms: Permission[] = ['read.leave', 'approve.leave'];
    expect(canWriteLeave(perms)).toBe(false);
    expect(canApproveLeave(perms)).toBe(true);
  });

  it('manage.leave grants write, approve, and configure', () => {
    const perms: Permission[] = ['manage.leave'];
    expect(canWriteLeave(perms)).toBe(true);
    expect(canApproveLeave(perms)).toBe(true);
    expect(canConfigureLeave(perms)).toBe(true);
  });
});

describe('resolveLeaveAdminApply', () => {
  it('write-only forces pending even when client requests auto-approve', () => {
    const r = resolveLeaveAdminApply(['write.leave'], true);
    expect(r).toEqual({ error: 'forbidden' });
  });

  it('write-only with adminApply false creates pending', () => {
    const r = resolveLeaveAdminApply(['write.leave'], false);
    expect(r).toEqual({ adminApply: false });
  });

  it('approve.leave allows auto-approve when requested', () => {
    const r = resolveLeaveAdminApply(['approve.leave'], true);
    expect(r).toEqual({ adminApply: true });
  });

  it('manage.leave allows auto-approve when requested', () => {
    const r = resolveLeaveAdminApply(['manage.leave'], true);
    expect(r).toEqual({ adminApply: true });
  });

  it('approve-only without request stays pending', () => {
    const r = resolveLeaveAdminApply(['approve.leave'], false);
    expect(r).toEqual({ adminApply: false });
  });
});
