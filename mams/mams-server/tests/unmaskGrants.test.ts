import { describe, it, expect } from 'vitest';
import {
  permissionsWithUnmaskGrants,
  dedupeUnmaskFieldGrants,
  type SensitiveUnmaskField,
} from '@mams/types';
import {
  effectiveUnmaskFieldGrants,
  userHasUnmaskGrant,
  applyUnmaskSensitivePermission,
} from '../src/services/unmaskGrants.service.js';

describe('permissionsWithUnmaskGrants', () => {
  it('omits unmask.sensitive when no grants', () => {
    const perms = permissionsWithUnmaskGrants('hr.admin', []);
    expect(perms).not.toContain('unmask.sensitive');
    expect(perms).toContain('read.real');
  });

  it('includes unmask.sensitive when grants present', () => {
    const perms = permissionsWithUnmaskGrants('hr.admin', ['pan']);
    expect(perms).toContain('unmask.sensitive');
  });
});

describe('effectiveUnmaskFieldGrants', () => {
  it('legacy user with unmask.sensitive and empty grants gets all fields', () => {
    const grants = effectiveUnmaskFieldGrants({
      unmaskFieldGrants: [],
      permissions: ['unmask.sensitive'],
    });
    expect(grants).toHaveLength(9);
  });

  it('explicit pan-only grant', () => {
    const grants = effectiveUnmaskFieldGrants({
      unmaskFieldGrants: ['pan'],
      permissions: ['unmask.sensitive'],
    });
    expect(grants).toEqual(['pan']);
  });
});

describe('userHasUnmaskGrant', () => {
  it('checks explicit grants', () => {
    expect(
      userHasUnmaskGrant(
        { unmaskFieldGrants: ['aadhaar'], permissions: ['unmask.sensitive'] } as any,
        'aadhaar'
      )
    ).toBe(true);
    expect(
      userHasUnmaskGrant(
        { unmaskFieldGrants: ['aadhaar'], permissions: ['unmask.sensitive'] } as any,
        'pan'
      )
    ).toBe(false);
  });
});

describe('applyUnmaskSensitivePermission', () => {
  it('adds unmask when grants exist', () => {
    const out = applyUnmaskSensitivePermission(['read.real', 'manage.users'], ['pan']);
    expect(out).toContain('unmask.sensitive');
  });
});

describe('dedupeUnmaskFieldGrants', () => {
  it('dedupes', () => {
    expect(dedupeUnmaskFieldGrants(['pan', 'pan', 'aadhaar'] as SensitiveUnmaskField[])).toEqual([
      'pan',
      'aadhaar',
    ]);
  });
});
