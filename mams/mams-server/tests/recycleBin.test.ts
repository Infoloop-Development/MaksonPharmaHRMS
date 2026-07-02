import { describe, expect, it } from 'vitest';
import {
  RECYCLE_BIN_RETENTION_DAYS,
  RecycleBinBulkBodySchema,
  RecycleBinListQuerySchema,
  PERMISSIONS_BY_ROLE,
  ROLE_PERMISSION_CAP,
  canAccessAdminConsole,
  canManageRecycleBin,
} from '@mams/types';
import { recycleBinRetentionCutoff } from '../src/services/recycleBin.service.js';

describe('RecycleBinListQuerySchema', () => {
  it('defaults page and pageSize', () => {
    const parsed = RecycleBinListQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(50);
  });

  it('accepts entityType filter', () => {
    const parsed = RecycleBinListQuerySchema.parse({ entityType: 'device', search: 'DEV' });
    expect(parsed.entityType).toBe('device');
    expect(parsed.search).toBe('DEV');
  });
});

describe('RecycleBinBulkBodySchema', () => {
  it('accepts up to 200 item refs', () => {
    const items = Array.from({ length: 200 }, (_, i) => ({
      entityType: 'employee' as const,
      id: `507f1f77bcf86cd7994390${String(i).padStart(2, '0')}`,
    }));
    expect(RecycleBinBulkBodySchema.parse({ items }).items).toHaveLength(200);
  });

  it('rejects empty item lists', () => {
    expect(() => RecycleBinBulkBodySchema.parse({ items: [] })).toThrow();
  });
});

describe('it.admin RBAC', () => {
  it('includes org governance and recycle bin permission', () => {
    const perms = PERMISSIONS_BY_ROLE['it.admin'];
    expect(perms).toContain('manage.org_users');
    expect(perms).toContain('manage.employees');
    expect(perms).toContain('manage.recycle_bin');
    expect(PERMISSIONS_BY_ROLE['org.admin']).not.toContain('manage.recycle_bin');
  });

  it('can access admin console and recycle bin', () => {
    const perms = PERMISSIONS_BY_ROLE['it.admin'];
    expect(canAccessAdminConsole('it.admin', perms)).toBe(true);
    expect(canManageRecycleBin(perms)).toBe(true);
    expect(canManageRecycleBin(PERMISSIONS_BY_ROLE['org.admin'])).toBe(false);
  });

  it('cap mirrors org.admin plus recycle bin', () => {
    const itCap = ROLE_PERMISSION_CAP['it.admin'];
    const orgCap = ROLE_PERMISSION_CAP['org.admin'];
    for (const p of orgCap) {
      expect(itCap).toContain(p);
    }
    expect(itCap).toContain('manage.recycle_bin');
  });
});

describe('recycleBinRetentionCutoff', () => {
  it('returns a date exactly retention days before now', () => {
    const now = Date.parse('2026-06-30T12:00:00.000Z');
    const cutoff = recycleBinRetentionCutoff(now);
    const diffDays = (now - cutoff.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBe(RECYCLE_BIN_RETENTION_DAYS);
  });
});
