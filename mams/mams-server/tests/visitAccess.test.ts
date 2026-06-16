import { describe, expect, it } from 'vitest';
import {
  VisitorRequestApproveSchema,
  defaultVisitValidUntil,
  resolveVisitValidUntil,
} from '@mams/types';

describe('defaultVisitValidUntil', () => {
  it('returns 18:00 IST same day when before 18:00', () => {
    const now = new Date('2026-06-02T12:00:00.000Z'); // 17:30 IST
    const until = defaultVisitValidUntil(now);
    expect(until.toISOString()).toBe('2026-06-02T12:30:00.000Z'); // 18:00 IST
  });

  it('returns 18:00 IST next day when at or after 18:00', () => {
    const now = new Date('2026-06-02T13:30:00.000Z'); // 19:00 IST
    const until = defaultVisitValidUntil(now);
    expect(until.toISOString()).toBe('2026-06-03T12:30:00.000Z');
  });
});

describe('resolveVisitValidUntil', () => {
  const decidedAt = new Date('2026-06-02T04:30:00.000Z'); // 10:00 IST

  it('uses default mode when visitAccess omitted', () => {
    const r = resolveVisitValidUntil(undefined, decidedAt);
    expect(r.visitAccessMode).toBe('default');
    expect(r.visitDurationHours).toBeNull();
    expect(r.visitValidUntil.toISOString()).toBe('2026-06-02T12:30:00.000Z');
  });

  it('adds duration hours from approval moment', () => {
    const r = resolveVisitValidUntil({ mode: 'duration', durationHours: 2 }, decidedAt);
    expect(r.visitAccessMode).toBe('duration');
    expect(r.visitDurationHours).toBe(2);
    expect(r.visitValidUntil.toISOString()).toBe('2026-06-02T06:30:00.000Z'); // 12:00 IST
  });

  it('parses explicit until date and time in IST', () => {
    const r = resolveVisitValidUntil(
      { mode: 'until', validUntilDate: '2026-06-02', validUntilTime: '15:30' },
      decidedAt
    );
    expect(r.visitAccessMode).toBe('until');
    expect(r.visitValidUntil.toISOString()).toBe('2026-06-02T10:00:00.000Z'); // 15:30 IST
  });
});

describe('VisitorRequestApproveSchema', () => {
  it('accepts visit access variants', () => {
    expect(VisitorRequestApproveSchema.safeParse({}).success).toBe(true);
    expect(VisitorRequestApproveSchema.safeParse({ visitAccess: { mode: 'default' } }).success).toBe(true);
    expect(
      VisitorRequestApproveSchema.safeParse({ visitAccess: { mode: 'duration', durationHours: 4 } }).success
    ).toBe(true);
    expect(
      VisitorRequestApproveSchema.safeParse({
        visitAccess: { mode: 'until', validUntilDate: '2026-06-02', validUntilTime: '18:00' },
      }).success
    ).toBe(true);
  });

  it('rejects invalid duration', () => {
    expect(
      VisitorRequestApproveSchema.safeParse({ visitAccess: { mode: 'duration', durationHours: 0 } }).success
    ).toBe(false);
  });
});
