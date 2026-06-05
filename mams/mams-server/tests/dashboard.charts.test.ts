import { describe, it, expect, vi, beforeEach } from 'vitest';

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
    vi.clearAllMocks();
    employeeCount.mockResolvedValue(1800);
    attendanceCount.mockResolvedValue(1260);
    attendanceAggregate
      .mockResolvedValueOnce([
        { _id: '2026-05-27', count: 1300 },
        { _id: '2026-05-28', count: 1350 },
        { _id: '2026-05-29', count: 1400 },
        { _id: '2026-05-30', count: 1500 },
        { _id: '2026-05-31', count: 1450 },
        { _id: '2026-06-01', count: 1550 },
        { _id: '2026-06-02', count: 1480 },
      ])
      .mockResolvedValueOnce([
        { realEntryAt: new Date('2026-06-01T03:30:00.000Z'), timeShift: 'Day' },
        { realEntryAt: new Date('2026-06-02T03:30:00.000Z'), timeShift: 'Day' },
        { realEntryAt: new Date('2026-06-02T04:00:00.000Z'), timeShift: 'Day' },
      ]);
  });

  it('returns last7Days and weekPunctuality shape', async () => {
    const result = await getDashboardCharts();
    expect(result.last7Days.dates).toHaveLength(7);
    expect(result.last7Days.present).toHaveLength(7);
    expect(result.last7Days.totalEmployees).toBe(1800);
    expect(result.weekRange.start).toBe(result.last7Days.dates[0]);
    expect(result.weekRange.end).toBe(result.last7Days.dates[6]);
    expect(result.weekPunctuality.totalActive).toBe(1800);
    expect(result.weekPunctuality.onTime + result.weekPunctuality.delay + result.weekPunctuality.onLeave).toBeGreaterThan(0);
    expect(result.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('classifies present rows across the week into onTime vs delay', async () => {
    const result = await getDashboardCharts();
    expect(result.weekPunctuality.onTime).toBe(2);
    expect(result.weekPunctuality.delay).toBe(1);
    expect(result.weekPunctuality.onLeave).toBe(1260);
  });

  it('queries punctuality over all 7 dates in the week match', async () => {
    await getDashboardCharts();
    const weekPresentMatch = attendanceAggregate.mock.calls[1]?.[0]?.[0]?.$match;
    expect(weekPresentMatch?.date?.$in).toHaveLength(7);
    expect(weekPresentMatch?.status).toBe('Present');

    const onLeaveMatch = attendanceCount.mock.calls[0]?.[0];
    expect(onLeaveMatch?.date?.$in).toHaveLength(7);
    expect(onLeaveMatch?.status?.$in).toEqual(['Absent', 'Weekly Off', 'Half Day']);
  });
});
