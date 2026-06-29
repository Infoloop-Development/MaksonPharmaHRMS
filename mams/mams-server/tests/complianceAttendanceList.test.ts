import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Types } from 'mongoose';
import { utcToIstDateString } from '../src/utils/time.js';

const TODAY = utcToIstDateString(new Date('2026-06-22T12:00:00Z'));
const OTHER_DATE = '2026-05-10';

const todayRows = [
  { _id: '1', date: TODAY, alternateShift: 'A', hoursWorked: 8, status: 'Present', employeeId: null },
  { _id: '2', date: TODAY, alternateShift: 'B', hoursWorked: 8, status: 'Present', employeeId: null },
  { _id: '3', date: TODAY, alternateShift: 'C', hoursWorked: 8, status: 'Present', employeeId: null },
];

const otherRows = Array.from({ length: 100 }, (_, i) => ({
  _id: String(10 + i),
  date: OTHER_DATE,
  alternateShift: 'A' as const,
  hoursWorked: 8,
  status: 'Present',
  employeeId: null,
}));

const allRows = [...todayRows, ...otherRows];

const findMock = vi.fn();
const employeeFind = vi.fn();

vi.mock('../src/models/ComplianceGeneratedAttendance.js', () => ({
  ComplianceGeneratedAttendanceModel: {
    find: (...args: unknown[]) => findMock(...args),
  },
}));

vi.mock('../src/models/Employee.js', () => ({
  EmployeeModel: {
    find: (...args: unknown[]) => employeeFind(...args),
  },
}));

const { resolveComplianceStatsScope, listComplianceGeneratedAttendance } = await import(
  '../src/services/complianceAttendanceList.service.js'
);

function rowsForFilter(filter: Record<string, unknown>) {
  if (filter.date === TODAY) return todayRows;
  if (filter.date === '2026-05-15') return todayRows.filter(() => false);
  if (filter.employeeId) {
    const scoped = filter.date === TODAY ? todayRows.slice(0, 1) : allRows.slice(0, 1);
    return scoped;
  }
  return allRows;
}

describe('resolveComplianceStatsScope', () => {
  it('defaults to today when no date or range', () => {
    const result = resolveComplianceStatsScope({});
    expect(result.scope).toBe('today');
    expect(result.scopeDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('uses date scope when date provided', () => {
    const result = resolveComplianceStatsScope({ date: '2026-05-15' });
    expect(result).toEqual({ scope: 'date', scopeDate: '2026-05-15' });
  });

  it('uses range scope when start or end provided', () => {
    const result = resolveComplianceStatsScope({ startDate: '2026-05-01', endDate: '2026-05-31' });
    expect(result).toEqual({ scope: 'range', scopeDate: '2026-05-01' });
  });
});

describe('listComplianceGeneratedAttendance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-22T12:00:00Z'));

    findMock.mockImplementation((filter: Record<string, unknown>) => {
      const rows = rowsForFilter(filter);
      return {
        select: () => ({
          lean: async () => rows.map((r) => ({ alternateShift: r.alternateShift })),
        }),
        populate: () => ({
          lean: async () => rows,
        }),
      };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('scopes stats to today but list total remains all rows when no date filter', async () => {
    const result = await listComplianceGeneratedAttendance({ page: 1, pageSize: 50 });

    expect(result.stats.scope).toBe('today');
    expect(result.stats.scopeDate).toBe(TODAY);
    expect(result.stats.total).toBe(3);
    expect(result.stats.byShift).toEqual({ A: 1, B: 1, C: 1 });
    expect(result.total).toBe(103);

    const statsCall = findMock.mock.calls.find(
      (call) => (call[0] as Record<string, unknown>).date === TODAY
    );
    expect(statsCall).toBeDefined();
  });

  it('scopes stats to explicit date when date filter set', async () => {
    findMock.mockImplementation((filter: Record<string, unknown>) => {
      const rows =
        filter.date === '2026-05-15'
          ? [{ alternateShift: 'A', date: '2026-05-15', hoursWorked: 8, status: 'Present', employeeId: null }]
          : allRows;
      return {
        select: () => ({
          lean: async () => rows.map((r) => ({ alternateShift: r.alternateShift })),
        }),
        populate: () => ({
          lean: async () => rows,
        }),
      };
    });

    const result = await listComplianceGeneratedAttendance({
      page: 1,
      pageSize: 50,
      date: '2026-05-15',
    });

    expect(result.stats.scope).toBe('date');
    expect(result.stats.scopeDate).toBe('2026-05-15');
    expect(result.stats.total).toBe(1);
    expect(result.total).toBe(1);
  });

  it('scopes stats to today and applies search when search without date', async () => {
    const empId = new Types.ObjectId();
    employeeFind.mockReturnValue({
      select: () => ({
        lean: async () => [{ _id: empId }],
      }),
    });

    const result = await listComplianceGeneratedAttendance({
      page: 1,
      pageSize: 50,
      search: 'mayur',
    });

    expect(result.stats.scope).toBe('today');
    expect(result.stats.scopeDate).toBe(TODAY);
    expect(employeeFind).toHaveBeenCalled();

    const statsCall = findMock.mock.calls.find((call) => {
      const f = call[0] as Record<string, unknown>;
      return f.date === TODAY && f.employeeId != null;
    });
    expect(statsCall).toBeDefined();
  });
});
