import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const employeeCount = vi.fn();
const attendanceAggregate = vi.fn();
const attendanceCount = vi.fn();

vi.mock('../src/models/Employee.js', () => ({
  EmployeeModel: {
    countDocuments: (...args: unknown[]) => employeeCount(...args),
  },
}));

vi.mock('../src/models/AttendanceDerived.js', () => ({
  AttendanceDerivedModel: {
    aggregate: (...args: unknown[]) => attendanceAggregate(...args),
    countDocuments: (...args: unknown[]) => attendanceCount(...args),
  },
}));

const { getDashboardCharts, isLateEntry } = await import('../src/services/dashboard.service.js');

describe('dashboard.service isLateEntry', () => {
  it('Day shift: on time at 09:00, late after 09:15', () => {
    const onTime = new Date('2026-06-02T03:30:00.000Z'); // 09:00 IST
    const late = new Date('2026-06-02T03:46:00.000Z'); // 09:16 IST
    expect(isLateEntry(onTime, 'Day')).toBe(false);
    expect(isLateEntry(late, 'Day')).toBe(true);
  });

  it('Night shift: on time before 20:00, late from 20:00', () => {
    const onTime = new Date('2026-06-02T13:00:00.000Z'); // 18:30 IST
    const late = new Date('2026-06-02T14:30:00.000Z'); // 20:00 IST
    expect(isLateEntry(onTime, 'Night')).toBe(false);
    expect(isLateEntry(late, 'Night')).toBe(true);
  });
});

describe('getDashboardCharts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-02T06:30:00.000Z'));
    vi.clearAllMocks();
    employeeCount.mockResolvedValue(1800);
    attendanceCount.mockResolvedValue(180);
    attendanceAggregate
      .mockResolvedValueOnce([
        { _id: '2026-05-27', count: 1638 },
        { _id: '2026-05-28', count: 1683 },
        { _id: '2026-05-29', count: 1701 },
        { _id: '2026-05-30', count: 1674 },
        { _id: '2026-05-31', count: 1602 },
        { _id: '2026-06-01', count: 1512 },
        { _id: '2026-06-02', count: 1404 },
      ])
      .mockResolvedValueOnce([
        { _id: '2026-05-27', count: 100 },
        { _id: '2026-06-02', count: 180 },
      ])
      .mockResolvedValueOnce([
        {
          date: '2026-06-02',
          realEntryAt: new Date('2026-06-02T03:30:00.000Z'),
          timeShift: 'Day',
        },
        {
          date: '2026-06-02',
          realEntryAt: new Date('2026-06-02T04:00:00.000Z'),
          timeShift: 'Day',
        },
        {
          date: '2026-06-01',
          realEntryAt: new Date('2026-06-01T04:00:00.000Z'),
          timeShift: 'Day',
        },
      ])
      .mockResolvedValueOnce([{ _id: '2026-06-02', count: 12 }])
      .mockResolvedValueOnce([{ _id: '2026-06-01', count: 3 }])
      .mockResolvedValueOnce([{ _id: '2026-06-02', count: 900 }])
      .mockResolvedValueOnce([{ _id: '2026-06-02', count: 504 }])
      .mockResolvedValueOnce([
        { realEntryAt: new Date('2026-06-02T03:30:00.000Z'), timeShift: 'Day' },
        { realEntryAt: new Date('2026-06-02T04:00:00.000Z'), timeShift: 'Day' },
      ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns last7Days and day punctuality shape', async () => {
    const result = await getDashboardCharts('2026-06-02');
    expect(result.last7Days.dates).toHaveLength(7);
    expect(result.last7Days.present).toHaveLength(7);
    expect(result.last7Days.absent).toHaveLength(7);
    expect(result.last7Days.late).toHaveLength(7);
    expect(result.last7Days.weeklyOff).toHaveLength(7);
    expect(result.last7Days.halfDay).toHaveLength(7);
    expect(result.last7Days.dayShiftPresent).toHaveLength(7);
    expect(result.last7Days.nightShiftPresent).toHaveLength(7);
    expect(result.last7Days.weeklyOff[6]).toBe(12);
    expect(result.last7Days.halfDay[5]).toBe(3);
    expect(result.last7Days.dayShiftPresent[6]).toBe(900);
    expect(result.last7Days.nightShiftPresent[6]).toBe(504);
    expect(result.last7Days.totalEmployees).toBe(1800);
    expect(result.last7Days.absent.reduce((s, n) => s + n, 0)).toBe(280);
    expect(result.last7Days.late.reduce((s, n) => s + n, 0)).toBe(2);
    expect(result.weekRange.start).toBe(result.last7Days.dates[0]);
    expect(result.weekRange.end).toBe(result.last7Days.dates[6]);
    expect(result.weekPunctuality.date).toBe('2026-06-02');
    expect(result.weekPunctuality.totalActive).toBe(1800);
    expect(
      result.weekPunctuality.onTime +
        result.weekPunctuality.delay +
        result.weekPunctuality.onLeave
    ).toBeGreaterThan(0);
    expect(result.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('classifies present rows for the selected day into onTime vs delay', async () => {
    const result = await getDashboardCharts('2026-06-02');
    expect(result.weekPunctuality.onTime).toBe(1);
    expect(result.weekPunctuality.delay).toBe(1);
    expect(result.weekPunctuality.onLeave).toBe(180);
  });

  it('queries punctuality for a single date when provided', async () => {
    await getDashboardCharts('2026-06-02');
    const dayPresentMatch = attendanceAggregate.mock.calls[7]?.[0]?.[0]?.$match;
    expect(dayPresentMatch?.date).toBe('2026-06-02');
    expect(dayPresentMatch?.status).toBe('Present');

    const onLeaveMatch = attendanceCount.mock.calls[0]?.[0];
    expect(onLeaveMatch?.date).toBe('2026-06-02');
    expect(onLeaveMatch?.status?.$in).toEqual(['Absent', 'Weekly Off', 'Half Day']);
  });
});
