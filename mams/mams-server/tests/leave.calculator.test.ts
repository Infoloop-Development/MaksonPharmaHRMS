import { describe, it, expect } from 'vitest';
import { calculateLeaveDays } from '../src/services/leave/leaveDayCalculator.service.js';

describe('calculateLeaveDays', () => {
  it('counts calendar days excluding holidays', () => {
    const result = calculateLeaveDays({
      fromDate: '2026-01-01',
      toDate: '2026-01-03',
      department: 'HR',
      location: 'Surendranagar, GJ',
      holidays: [{ date: '2026-01-02', departments: [], locations: [] }],
    });
    expect(result.totalDays).toBe(2);
    expect(result.excludedHolidayDates).toEqual(['2026-01-02']);
  });

  it('half day counts as 0.5', () => {
    const result = calculateLeaveDays({
      fromDate: '2026-03-10',
      toDate: '2026-03-10',
      halfDayPortion: 'first',
      department: 'HR',
      location: 'Surendranagar, GJ',
      holidays: [],
    });
    expect(result.totalDays).toBe(0.5);
  });

  it('half day on holiday is zero', () => {
    const result = calculateLeaveDays({
      fromDate: '2026-03-10',
      toDate: '2026-03-10',
      halfDayPortion: 'second',
      department: 'HR',
      location: 'Surendranagar, GJ',
      holidays: [{ date: '2026-03-10', departments: [], locations: [] }],
    });
    expect(result.totalDays).toBe(0);
  });
});
