import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

const employeeFind = vi.fn();
const rawAggregate = vi.fn();

vi.mock('../src/models/Employee.js', () => ({
  EmployeeModel: {
    find: (...args: unknown[]) => employeeFind(...args),
  },
}));

vi.mock('../src/models/AttendanceRaw.js', () => ({
  AttendanceRawModel: {
    aggregate: (...args: unknown[]) => rawAggregate(...args),
  },
}));

const { getRawPunchStats } = await import('../src/services/attendanceRawStats.service.js');

describe('getRawPunchStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rawAggregate.mockResolvedValue([
      {
        _id: null,
        total: 10,
        in: 6,
        out: 3,
        other: 1,
        employeeIds: [new Types.ObjectId(), new Types.ObjectId(), new Types.ObjectId()],
      },
    ]);
  });

  it('defaults to today scope when no filters', async () => {
    const result = await getRawPunchStats({});
    expect(result.scope).toBe('today');
    expect(result.scopeDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.total).toBe(10);
    expect(result.in).toBe(6);
    expect(result.out).toBe(3);
    expect(result.other).toBe(1);
    expect(result.uniqueEmployees).toBe(3);
    expect(rawAggregate).toHaveBeenCalled();
  });

  it('uses date scope when date provided', async () => {
    const result = await getRawPunchStats({ date: '2026-06-08' });
    expect(result.scope).toBe('date');
    expect(result.scopeDate).toBe('2026-06-08');
  });

  it('uses range scope for date range', async () => {
    const result = await getRawPunchStats({ startDate: '2026-06-01', endDate: '2026-06-07' });
    expect(result.scope).toBe('range');
    expect(result.scopeDate).toBe('2026-06-01');
  });

  it('uses all scope when search without date', async () => {
    const empId = new Types.ObjectId();
    employeeFind.mockReturnValue({
      select: () => ({
        lean: async () => [{ _id: empId }],
      }),
    });
    const result = await getRawPunchStats({ search: 'alice' });
    expect(result.scope).toBe('all');
    expect(employeeFind).toHaveBeenCalled();
  });

  it('returns zeros when no punches match', async () => {
    rawAggregate.mockResolvedValue([]);
    const result = await getRawPunchStats({ date: '2026-01-01' });
    expect(result).toEqual({
      total: 0,
      in: 0,
      out: 0,
      other: 0,
      uniqueEmployees: 0,
      scope: 'date',
      scopeDate: '2026-01-01',
    });
  });
});
