/**
 * Regression tests for POST /employees duplicate-key mapping (Mongo E11000).
 *
 * Manual UAT (dev:server + dev:web, user with manage.users):
 * 1. Duplicate biometric — reuse an existing biometricId from the list; save Add employee → expect biometric wording.
 * 2. Duplicate empCode — force next allocated MKS#### to match an existing row (e.g. tweak Settings employeeCodeSequence or CSV), save → expect employee code wording, not biometric-only.
 * 3. Happy path — unique biometric and valid payload → 201, row appears, next-code invalidates.
 */
import { describe, expect, it } from 'vitest';
import { mapEmployeeCreateDuplicateError } from '../src/utils/mongoDuplicate.js';

describe('mapEmployeeCreateDuplicateError', () => {
  const cases: Array<{
    name: string;
    input: unknown;
    expectNull: boolean;
    status?: number;
    code?: string;
    messageIncludes?: string[];
  }> = [
    {
      name: 'keyPattern biometricId',
      input: { code: 11000, keyPattern: { biometricId: 1 } },
      expectNull: false,
      status: 409,
      code: 'duplicate_biometric_id',
      messageIncludes: ['Biometric ID', 'unique'],
    },
    {
      name: 'keyPattern empCode',
      input: { code: 11000, keyPattern: { empCode: 1 } },
      expectNull: false,
      status: 409,
      code: 'duplicate_emp_code',
      messageIncludes: ['Employee code', 'Refresh'],
    },
    {
      name: 'keyValue biometricId only',
      input: { code: 11000, keyValue: { biometricId: 'BIO999' } },
      expectNull: false,
      status: 409,
      code: 'duplicate_biometric_id',
      messageIncludes: ['Biometric ID'],
    },
    {
      name: 'keyValue empCode only',
      input: { code: 11000, keyValue: { empCode: 'MKS0001' } },
      expectNull: false,
      status: 409,
      code: 'duplicate_emp_code',
      messageIncludes: ['Employee code'],
    },
    {
      name: '11000 no key hints',
      input: { code: 11000 },
      expectNull: false,
      status: 409,
      code: 'duplicate_key',
      messageIncludes: ['duplicate unique field'],
    },
    {
      name: 'non-11000 returns null',
      input: { code: 999 },
      expectNull: true,
    },
  ];

  for (const c of cases) {
    it(c.name, () => {
      const out = mapEmployeeCreateDuplicateError(c.input);
      if (c.expectNull) {
        expect(out).toBeNull();
        return;
      }
      expect(out).not.toBeNull();
      expect(out!.status).toBe(c.status);
      expect(out!.code).toBe(c.code);
      for (const frag of c.messageIncludes ?? []) {
        expect(out!.message).toContain(frag);
      }
    });
  }
});
