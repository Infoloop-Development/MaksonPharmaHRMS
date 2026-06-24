import { describe, it, expect } from 'vitest';
import {
  BASELINE_HOURS,
  BASELINE_WORKING_DAYS,
  computeMonthlyPlan,
  workDurationMsForTest,
  clockInMsForTest,
} from './monthlyCompliancePlanner';
import { COMPLIANCE_SHIFT_BUFFER_PRESETS, parseTimeHmsMs } from './shiftAutogeneration';

const JUNE_2026 = '2026-06';
const PRESET_A = COMPLIANCE_SHIFT_BUFFER_PRESETS.A;

function plan(realHours: number) {
  const result = computeMonthlyPlan({
    yearMonth: JUNE_2026,
    shift: 'A',
    bufferStart: PRESET_A.bufferStart,
    bufferEnd: PRESET_A.bufferEnd,
    realHours,
  });
  if ('error' in result) throw new Error(result.error);
  return result;
}

describe('computeMonthlyPlan', () => {
  it('320 h → 26 present, 112 extra cash, 0 leave', () => {
    const { summary } = plan(320);
    expect(summary.presentDays).toBe(26);
    expect(summary.leaveDays).toBe(0);
    expect(summary.extraCashHours).toBe(112);
    expect(summary.deductedHours).toBe(0);
  });

  it('160 h → 20 present, 6 leave', () => {
    const { summary } = plan(160);
    expect(summary.presentDays).toBe(20);
    expect(summary.leaveDays).toBe(6);
    expect(summary.deductedHours).toBe(48);
    expect(summary.extraCashHours).toBe(0);
  });

  it('208 h → 26 present, 0 leave, 0 extra', () => {
    const { summary } = plan(208);
    expect(summary.presentDays).toBe(BASELINE_WORKING_DAYS);
    expect(summary.leaveDays).toBe(0);
    expect(summary.extraCashHours).toBe(0);
    expect(summary.baselineHours).toBe(BASELINE_HOURS);
  });

  it('marks all Sundays as weekly off', () => {
    const { days } = plan(208);
    const sundays = days.filter((d) => d.weekday === 'Sun');
    expect(sundays.length).toBeGreaterThan(0);
    expect(sundays.every((d) => d.status === 'weeklyOff')).toBe(true);
  });

  it('clock-in always within buffer bounds on present days', () => {
    const start = parseTimeHmsMs(PRESET_A.bufferStart)!;
    const end = parseTimeHmsMs(PRESET_A.bufferEnd)!;
    const { days } = plan(208);
    for (const d of days.filter((x) => x.status === 'present')) {
      const inMs = clockInMsForTest(d.date, JUNE_2026, start, end);
      expect(inMs).toBeGreaterThanOrEqual(start);
      expect(inMs).toBeLessThanOrEqual(end);
    }
  });

  it('work duration never exactly 8 hours', () => {
    const { days } = plan(208);
    for (const d of days.filter((x) => x.status === 'present')) {
      const durMs = workDurationMsForTest(d.date, JUNE_2026);
      expect(durMs).not.toBe(8 * 60 * 60 * 1000);
      expect(durMs).toBeGreaterThanOrEqual((7 * 60 + 50) * 60 * 1000);
      expect(durMs).toBeLessThanOrEqual((8 * 60 + 10) * 60 * 1000);
    }
  });

  it('same month + shift yields identical punch set', () => {
    const a = plan(208);
    const b = plan(208);
    const presentA = a.days.filter((d) => d.status === 'present');
    const presentB = b.days.filter((d) => d.status === 'present');
    expect(presentA.map((d) => d.date)).toEqual(presentB.map((d) => d.date));
    expect(presentA.map((d) => d.clockIn)).toEqual(presentB.map((d) => d.clockIn));
    expect(presentA.map((d) => d.clockOut)).toEqual(presentB.map((d) => d.clockOut));
  });

  it('shift C overnight can produce next-day clock-out', () => {
    const preset = COMPLIANCE_SHIFT_BUFFER_PRESETS.C;
    const result = computeMonthlyPlan({
      yearMonth: JUNE_2026,
      shift: 'C',
      bufferStart: preset.bufferStart,
      bufferEnd: preset.bufferEnd,
      realHours: 208,
    });
    if ('error' in result) throw new Error(result.error);
    const overnight = result.days.some((d) => d.status === 'present' && d.clockOutNextDay);
    expect(overnight).toBe(true);
  });
});
