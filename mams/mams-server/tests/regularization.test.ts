import { describe, expect, it } from 'vitest';
import {
  RegularizationCreateSchema,
  RegularizationRejectSchema,
  regularizationTypeNeedsIn,
  regularizationTypeNeedsOut,
} from '@mams/types';
import { buildPunchInsertSpecs } from '../src/services/regularization/regularizationApply.service.js';

describe('RegularizationCreateSchema', () => {
  it('accepts missed_in with IN time', () => {
    const r = RegularizationCreateSchema.safeParse({
      employeeId: '507f1f77bcf86cd799439011',
      date: '2026-06-02',
      type: 'missed_in',
      requestedInTime: '09:30',
      reason: 'Forgot to punch in at gate',
    });
    expect(r.success).toBe(true);
  });

  it('rejects missed_in without IN time', () => {
    const r = RegularizationCreateSchema.safeParse({
      employeeId: '507f1f77bcf86cd799439011',
      date: '2026-06-02',
      type: 'missed_in',
      reason: 'Forgot to punch in at gate',
    });
    expect(r.success).toBe(false);
  });

  it('accepts missed_both with IN and OUT', () => {
    const r = RegularizationCreateSchema.safeParse({
      employeeId: '507f1f77bcf86cd799439011',
      date: '2026-06-02',
      type: 'missed_both',
      requestedInTime: '09:00',
      requestedOutTime: '18:00',
      reason: 'Device was offline all day',
    });
    expect(r.success).toBe(true);
  });

  it('accepts other without times', () => {
    const r = RegularizationCreateSchema.safeParse({
      employeeId: '507f1f77bcf86cd799439011',
      date: '2026-06-02',
      type: 'other',
      reason: 'Manual correction requested by manager',
    });
    expect(r.success).toBe(true);
  });

  it('rejects short reason', () => {
    const r = RegularizationCreateSchema.safeParse({
      employeeId: '507f1f77bcf86cd799439011',
      date: '2026-06-02',
      type: 'missed_in',
      requestedInTime: '09:30',
      reason: 'too short',
    });
    expect(r.success).toBe(false);
  });
});

describe('RegularizationRejectSchema', () => {
  it('requires approver note', () => {
    expect(RegularizationRejectSchema.safeParse({}).success).toBe(false);
    expect(RegularizationRejectSchema.safeParse({ approverNote: 'Insufficient evidence' }).success).toBe(true);
  });
});

describe('regularizationTypeNeedsIn/Out', () => {
  it('missed_in needs IN only', () => {
    expect(regularizationTypeNeedsIn('missed_in')).toBe(true);
    expect(regularizationTypeNeedsOut('missed_in')).toBe(false);
  });

  it('missed_both needs both', () => {
    expect(regularizationTypeNeedsIn('missed_both')).toBe(true);
    expect(regularizationTypeNeedsOut('missed_both')).toBe(true);
  });

  it('other needs neither', () => {
    expect(regularizationTypeNeedsIn('other')).toBe(false);
    expect(regularizationTypeNeedsOut('other')).toBe(false);
  });
});

describe('buildPunchInsertSpecs', () => {
  it('builds IN punch for missed_in', () => {
    const specs = buildPunchInsertSpecs('req123', '2026-06-02', 'missed_in', '09:30', null);
    expect(specs).toHaveLength(1);
    expect(specs[0]!.punchType).toBe('IN');
    expect(specs[0]!.idempotencyKey).toBe('reg:req123:in');
  });

  it('builds IN and OUT for missed_both', () => {
    const specs = buildPunchInsertSpecs('req456', '2026-06-02', 'missed_both', '09:00', '18:30');
    expect(specs).toHaveLength(2);
    expect(specs.map((s) => s.punchType)).toEqual(['IN', 'OUT']);
    expect(specs[0]!.idempotencyKey).toBe('reg:req456:in');
    expect(specs[1]!.idempotencyKey).toBe('reg:req456:out');
  });

  it('returns empty for other type without times', () => {
    const specs = buildPunchInsertSpecs('req789', '2026-06-02', 'other', null, null);
    expect(specs).toHaveLength(0);
  });
});
