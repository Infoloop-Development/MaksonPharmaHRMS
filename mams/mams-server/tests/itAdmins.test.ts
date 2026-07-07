import { describe, expect, it } from 'vitest';
import {
  ItAdminCreateBodySchema,
  ItAdminCreateResponseSchema,
  permissionsForDelegatedItAdmin,
  PERMISSIONS_BY_ROLE,
  IT_ADMIN_GOVERNANCE_PERMISSIONS,
} from '@mams/types';
import { generateSecurePassword } from '../src/utils/generateSecurePassword.js';
import { passwordPolicyScore } from '../src/utils/passwordPolicy.js';

describe('permissionsForDelegatedItAdmin', () => {
  it('omits org governance permissions from it.admin defaults', () => {
    const perms = permissionsForDelegatedItAdmin();
    for (const p of IT_ADMIN_GOVERNANCE_PERMISSIONS) {
      expect(perms).not.toContain(p);
    }
  });

  it('keeps operational IT permissions', () => {
    const perms = permissionsForDelegatedItAdmin();
    expect(perms).toContain('manage.bug_reports');
    expect(perms).toContain('manage.recycle_bin');
    expect(perms).toContain('read.real');
  });

  it('is a strict subset of full it.admin defaults', () => {
    const full = new Set(PERMISSIONS_BY_ROLE['it.admin']);
    for (const p of permissionsForDelegatedItAdmin()) {
      expect(full.has(p)).toBe(true);
    }
  });
});

describe('ItAdminCreateBodySchema', () => {
  it('normalizes email to lowercase', () => {
    const parsed = ItAdminCreateBodySchema.parse({
      name: 'Alex IT',
      email: 'Alex@Example.COM',
    });
    expect(parsed.email).toBe('alex@example.com');
  });
});

describe('ItAdminCreateResponseSchema', () => {
  it('requires initialPassword on create response', () => {
    const parsed = ItAdminCreateResponseSchema.parse({
      id: '507f1f77bcf86cd799439011',
      name: 'Alex',
      email: 'alex@example.com',
      isActive: true,
      createdAt: new Date().toISOString(),
      initialPassword: 'TempPass123!',
    });
    expect(parsed.initialPassword).toBe('TempPass123!');
  });
});

describe('generateSecurePassword', () => {
  it('generates passwords meeting policy score', () => {
    const password = generateSecurePassword();
    expect(password.length).toBeGreaterThanOrEqual(10);
    expect(passwordPolicyScore(password)).toBeGreaterThanOrEqual(3);
  });

  it('generates unique values', () => {
    const a = generateSecurePassword();
    const b = generateSecurePassword();
    expect(a).not.toBe(b);
  });
});
