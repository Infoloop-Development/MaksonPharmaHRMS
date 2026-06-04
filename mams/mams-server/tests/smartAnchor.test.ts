import { describe, it, expect } from 'vitest';
import { smartAnchorV2, decomposeHours, COMPLIANCE_WINDOWS } from '../src/services/smartAnchor.js';
import { hashString, seededRandom } from '../src/utils/prng.js';

describe('PRNG', () => {
  it('is deterministic for the same seed', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b());
    }
  });

  it('produces different sequences for different seeds', () => {
    const a = seededRandom(42);
    const b = seededRandom(43);
    let allEqual = true;
    for (let i = 0; i < 10; i++) {
      if (a() !== b()) { allEqual = false; break; }
    }
    expect(allEqual).toBe(false);
  });

  it('produces values in [0, 1)', () => {
    const r = seededRandom(12345);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('hashString returns a positive 31-bit int', () => {
    const cases = ['MKS0001:2026-04-30', 'MKS9999:2026-12-31', 'X', ''];
    for (const c of cases) {
      const h = hashString(c);
      expect(h).toBeGreaterThan(0);
      expect(h).toBeLessThan(2 ** 31);
    }
  });
});

describe('Smart Anchor v2 - determinism', () => {
  const baseInput = {
    employeeId: '507f1f77bcf86cd799439011',
    date: '2026-04-30',
    alternateShift: 'A' as const,
    realEntryAt: new Date('2026-04-30T03:30:00Z'),
    realExitAt: new Date('2026-04-30T15:30:00Z'),
  };

  it('same input always produces same output', () => {
    const out1 = smartAnchorV2(baseInput);
    const out2 = smartAnchorV2(baseInput);
    const out3 = smartAnchorV2(baseInput);
    expect(out1.compliantEntryAt.getTime()).toBe(out2.compliantEntryAt.getTime());
    expect(out2.compliantEntryAt.getTime()).toBe(out3.compliantEntryAt.getTime());
    expect(out1.compliantExitAt.getTime()).toBe(out2.compliantExitAt.getTime());
  });

  it('different employees on same date produce different outputs', () => {
    const a = smartAnchorV2({ ...baseInput, employeeId: 'emp-a' });
    const b = smartAnchorV2({ ...baseInput, employeeId: 'emp-b' });
    // Almost certainly different given different seed - statistical, not absolute.
    expect(a.compliantEntryAt.getTime()).not.toBe(b.compliantEntryAt.getTime());
  });

  it('compliant exit is exactly 8 hours after compliant entry', () => {
    const out = smartAnchorV2(baseInput);
    const diffMs = out.compliantExitAt.getTime() - out.compliantEntryAt.getTime();
    expect(diffMs).toBe(8 * 60 * 60 * 1000);
  });

  it('compliant entry falls within the assigned shift window', () => {
    for (const shift of ['A', 'B', 'C'] as const) {
      const out = smartAnchorV2({ ...baseInput, alternateShift: shift });
      const istHours = out.compliantEntryAt.getUTCHours() + 5.5; // crude IST projection for test
      const istHourLocal = ((istHours % 24) + 24) % 24;
      const expectedStart = COMPLIANCE_WINDOWS[shift].startHour;
      // Should be within first 30 minutes of the shift.
      const isWithin = Math.abs(istHourLocal - expectedStart) < 1 || Math.abs(istHourLocal - expectedStart - 24) < 1;
      expect(isWithin).toBe(true);
    }
  });

  it('returns a smartAnchorVersion tag', () => {
    const out = smartAnchorV2(baseInput);
    expect(out.smartAnchorVersion).toBe('v2.0.0');
  });
});

describe('Hours decomposition', () => {
  it('computes gross, net, compliant, and OT correctly', () => {
    const entry = new Date('2026-04-30T03:30:00Z'); // 09:00 IST
    const exit  = new Date('2026-04-30T15:30:00Z'); // 21:00 IST - 12 hours later
    const out = decomposeHours(entry, exit, 30);
    expect(out.realGrossHours).toBe(12);
    expect(out.realNetHours).toBe(11.5);
    expect(out.compliantHours).toBe(9.5);
    expect(out.otHours).toBe(2);
    expect(out.breakMinutes).toBe(30);
  });

  it('handles short shifts with no OT', () => {
    const entry = new Date('2026-04-30T03:30:00Z');
    const exit = new Date('2026-04-30T08:30:00Z'); // 5 hours
    const out = decomposeHours(entry, exit, 30);
    expect(out.realGrossHours).toBe(5);
    expect(out.realNetHours).toBe(4.5);
    expect(out.compliantHours).toBe(4.5);
    expect(out.otHours).toBe(0);
  });

  it('clamps to zero when exit is before entry', () => {
    const entry = new Date('2026-04-30T08:00:00Z');
    const exit = new Date('2026-04-30T07:00:00Z');
    const out = decomposeHours(entry, exit, 30);
    expect(out.realGrossHours).toBe(0);
    expect(out.realNetHours).toBe(0);
  });
});
