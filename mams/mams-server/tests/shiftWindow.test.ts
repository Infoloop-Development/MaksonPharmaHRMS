import { describe, expect, it } from 'vitest';
import {
  isPunchOutsideRealShift,
  isTimeWithinShiftWindow,
  parseHHMMToMinutes,
} from '@mams/types';

describe('shiftWindow', () => {
  it('parseHHMMToMinutes', () => {
    expect(parseHHMMToMinutes('07:00')).toBe(7 * 60);
    expect(parseHHMMToMinutes('14:00')).toBe(14 * 60);
  });

  it('day window 07:00-14:00', () => {
    expect(isTimeWithinShiftWindow(8 * 60, '07:00', '14:00')).toBe(true);
    expect(isTimeWithinShiftWindow(17 * 60, '07:00', '14:00')).toBe(false);
    expect(isTimeWithinShiftWindow(7 * 60, '07:00', '14:00')).toBe(true);
    expect(isTimeWithinShiftWindow(14 * 60, '07:00', '14:00')).toBe(false);
  });

  it('overnight night window 18:00-06:00', () => {
    expect(isTimeWithinShiftWindow(23 * 60, '18:00', '06:00')).toBe(true);
    expect(isTimeWithinShiftWindow(5 * 60, '18:00', '06:00')).toBe(true);
    expect(isTimeWithinShiftWindow(12 * 60, '18:00', '06:00')).toBe(false);
  });

  it('isPunchOutsideRealShift uses realShifts by employee timeShift', () => {
    const realShifts = [
      { id: 'Day', start: '07:00', end: '14:00', label: 'Day Shift' },
      { id: 'Night', start: '18:00', end: '06:00', label: 'Night Shift' },
    ];
    const morning = new Date('2026-06-02T02:30:00.000Z'); // 08:00 IST
    const evening = new Date('2026-06-02T11:30:00.000Z'); // 17:00 IST
    const night = new Date('2026-06-02T17:30:00.000Z'); // 23:00 IST
    expect(isPunchOutsideRealShift(morning, 'Day', realShifts)).toBe(false);
    expect(isPunchOutsideRealShift(evening, 'Day', realShifts)).toBe(true);
    expect(isPunchOutsideRealShift(night, 'Night', realShifts)).toBe(false);
  });
});
