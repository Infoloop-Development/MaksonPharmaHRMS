import { describe, it, expect } from 'vitest';
import {
  COMPLIANCE_SHIFT_BUFFER_PRESETS,
  generateDailyCompliancePunches,
  isSundayIstDate,
  parseTimeHmsMs,
} from '@mams/types';

describe('complianceDailyGenerator', () => {
  it('generates deterministic punches for same seed', () => {
    const a = generateDailyCompliancePunches({
      seedBase: 'emp1:2026-06-25',
      alternateShift: 'A',
    });
    const b = generateDailyCompliancePunches({
      seedBase: 'emp1:2026-06-25',
      alternateShift: 'A',
    });
    expect(a).toEqual(b);
    expect(a.checkIn).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('clock-in falls within shift A buffer preset', () => {
    const preset = COMPLIANCE_SHIFT_BUFFER_PRESETS.A;
    const startMs = parseTimeHmsMs(preset.bufferStart)!;
    const endMs = parseTimeHmsMs(preset.bufferEnd)!;
    const punches = generateDailyCompliancePunches({
      seedBase: 'emp2:2026-06-25',
      alternateShift: 'A',
    });
    const inMs = parseTimeHmsMs(punches.checkIn)!;
    expect(inMs).toBeGreaterThanOrEqual(startMs);
    expect(inMs).toBeLessThan(endMs);
  });

  it('work duration is between 7h50 and 8h10', () => {
    const punches = generateDailyCompliancePunches({
      seedBase: 'emp3:2026-06-25',
      alternateShift: 'B',
    });
    expect(punches.hoursWorked).toBeGreaterThanOrEqual(7 + 50 / 60);
    expect(punches.hoursWorked).toBeLessThanOrEqual(8 + 10 / 60);
    expect(punches.hoursWorked).not.toBe(8);
  });

  it('detects Sunday IST dates', () => {
    expect(isSundayIstDate('2026-06-21')).toBe(true);
    expect(isSundayIstDate('2026-06-22')).toBe(false);
  });
});
