import { describe, it, expect } from 'vitest';
import { COMPLIANCE_SHIFT_BUFFER_PRESETS, parseTimeHmsMs } from '@mams/types';
import {
  BASELINE_HOURS,
  BASELINE_WORKING_DAYS,
  computeMonthlyPlan,
  workDurationMsForTest,
  clockInMsForTest,
} from '@mams/types';

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

  it('192 h → 2 leave days that are not consecutive', () => {
    const { summary, days } = plan(192);
    expect(summary.leaveDays).toBe(2);
    expect(summary.presentDays).toBe(24);
    expect(summary.deductedHours).toBe(16);

    const leaveDates = days.filter((d) => d.status === 'leave').map((d) => d.date).sort();
    expect(leaveDates).toHaveLength(2);
    const a = Date.parse(`${leaveDates[0]}T00:00:00Z`);
    const b = Date.parse(`${leaveDates[1]}T00:00:00Z`);
    expect(Math.abs(b - a)).toBeGreaterThan(24 * 60 * 60 * 1000);
  });

  it('160 h → leave days are not consecutive when spacing fits', () => {
    const { days, summary } = plan(160);
    expect(summary.leaveDays).toBe(6);
    const leaveDates = days.filter((d) => d.status === 'leave').map((d) => d.date).sort();
    expect(leaveDates).toHaveLength(6);
    for (let i = 1; i < leaveDates.length; i++) {
      const prev = Date.parse(`${leaveDates[i - 1]}T00:00:00Z`);
      const cur = Date.parse(`${leaveDates[i]}T00:00:00Z`);
      expect(Math.abs(cur - prev)).toBeGreaterThan(24 * 60 * 60 * 1000);
    }
  });

  it('leave placement stays deterministic for the same seed', () => {
    const a = plan(192);
    const b = plan(192);
    expect(a.days.filter((d) => d.status === 'leave').map((d) => d.date)).toEqual(
      b.days.filter((d) => d.status === 'leave').map((d) => d.date)
    );
  });

  it('different hour shortfalls reshuffle leave days (no fixed pattern)', () => {
    const a = plan(192)
      .days.filter((d) => d.status === 'leave')
      .map((d) => d.date)
      .sort();
    const b = plan(176)
      .days.filter((d) => d.status === 'leave')
      .map((d) => d.date)
      .sort();
    // 192 → 2 leave, 176 → 4 leave; sets should not be identical prefixes of a fixed pattern
    expect(a).toHaveLength(2);
    expect(b).toHaveLength(4);
    expect(a.join(',')).not.toBe(b.slice(0, 2).join(','));
  });

  it('leave weekdays are mixed (not all the same weekday)', () => {
    const leave = plan(160).days.filter((d) => d.status === 'leave');
    const weekdays = new Set(leave.map((d) => d.weekday));
    expect(weekdays.size).toBeGreaterThan(1);
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
    expect(presentA.map((d) => d.checkIn)).toEqual(presentB.map((d) => d.checkIn));
    expect(presentA.map((d) => d.checkOut)).toEqual(presentB.map((d) => d.checkOut));
  });

  it('assigns involved personnel to present days', () => {
    const { days } = plan(208);
    const present = days.filter((d) => d.status === 'present');
    expect(present.length).toBeGreaterThan(0);
    expect(present.every((d) => d.involvedPerson === null)).toBe(true);

    const withPeople = computeMonthlyPlan({
      yearMonth: JUNE_2026,
      shift: 'A',
      bufferStart: PRESET_A.bufferStart,
      bufferEnd: PRESET_A.bufferEnd,
      realHours: 208,
      involvedPersonnel: 'Alice, Bob',
    });
    if ('error' in withPeople) throw new Error(withPeople.error);
    const named = withPeople.days.filter((d) => d.status === 'present');
    expect(named.every((d) => d.involvedPerson === 'Alice' || d.involvedPerson === 'Bob')).toBe(true);
    expect(named.some((d) => d.involvedPerson === 'Alice')).toBe(true);
    expect(named.some((d) => d.involvedPerson === 'Bob')).toBe(true);
  });

  it('present days always have check-in and check-out', () => {
    const { days } = plan(208);
    for (const d of days.filter((x) => x.status === 'present')) {
      expect(d.checkIn).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      expect(d.checkOut).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      expect(d.hoursWorked).toBeGreaterThan(0);
      expect(d.hoursWorkedFormatted).toMatch(/^\d+ hr \d+ min$/);
    }
  });

  it('real leave dates are labeled leave directly, not left to the random shuffle', () => {
    // 2026-06-03 and 2026-06-04 are Wed/Thu - eligible weekdays in June 2026.
    const result = computeMonthlyPlan({
      yearMonth: JUNE_2026,
      shift: 'A',
      bufferStart: PRESET_A.bufferStart,
      bufferEnd: PRESET_A.bufferEnd,
      realHours: 160, // computes to 6 leave days on its own
      realLeaveDates: ['2026-06-03', '2026-06-04'],
    });
    if ('error' in result) throw new Error(result.error);
    const byDate = new Map(result.days.map((d) => [d.date, d.status]));
    expect(byDate.get('2026-06-03')).toBe('leave');
    expect(byDate.get('2026-06-04')).toBe('leave');
    expect(result.summary.leaveDays).toBe(6);
    expect(result.summary.calendarLeaveDays).toBe(6);
  });

  it('real leave dates are honored in full even when they exceed the hours-computed leave count', () => {
    // realHours=208 computes 0 leave days on its own, but 3 real leave days exist.
    const realLeaveDates = ['2026-06-02', '2026-06-03', '2026-06-04'];
    const result = computeMonthlyPlan({
      yearMonth: JUNE_2026,
      shift: 'A',
      bufferStart: PRESET_A.bufferStart,
      bufferEnd: PRESET_A.bufferEnd,
      realHours: 208,
      realLeaveDates,
    });
    if ('error' in result) throw new Error(result.error);
    const byDate = new Map(result.days.map((d) => [d.date, d.status]));
    for (const date of realLeaveDates) {
      expect(byDate.get(date)).toBe('leave');
    }
    expect(result.summary.leaveDays).toBe(3);
    expect(result.summary.presentDays).toBe(BASELINE_WORKING_DAYS - 3);
  });

  it('real leave dates outside the eligible weekday set (e.g. Sundays) are ignored', () => {
    // 2026-06-07 is a Sunday in June 2026 - already weeklyOff, shouldn't double-count as leave.
    const result = computeMonthlyPlan({
      yearMonth: JUNE_2026,
      shift: 'A',
      bufferStart: PRESET_A.bufferStart,
      bufferEnd: PRESET_A.bufferEnd,
      realHours: 208,
      realLeaveDates: ['2026-06-07'],
    });
    if ('error' in result) throw new Error(result.error);
    const day = result.days.find((d) => d.date === '2026-06-07');
    expect(day?.status).toBe('weeklyOff');
    expect(result.summary.leaveDays).toBe(0);
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
