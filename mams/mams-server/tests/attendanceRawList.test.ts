import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

const employeeFind = vi.fn();
const rawCount = vi.fn();
const rawFindChain = vi.fn();

vi.mock('../src/models/Employee.js', () => ({
  EmployeeModel: {
    find: (...args: unknown[]) => employeeFind(...args),
  },
}));

vi.mock('../src/models/AttendanceRaw.js', () => ({
  AttendanceRawModel: {
    countDocuments: (...args: unknown[]) => rawCount(...args),
    find: (...args: unknown[]) => rawFindChain(...args),
  },
}));

vi.mock('../src/models/Settings.js', () => ({
  SettingsModel: {
    findOne: () => ({
      lean: async () => ({
        realShifts: [
          { id: 'Day', start: '06:00', end: '18:00', label: 'Day Shift' },
          { id: 'Night', start: '18:00', end: '06:00', label: 'Night Shift' },
        ],
      }),
    }),
  },
}));

const { buildRawPunchFilter, listRawPunches } = await import(
  '../src/services/attendanceRawList.service.js'
);

function mockRawFind(items: unknown[] = [], opts?: { noSkip?: boolean }) {
  const limitFn = () => ({
    lean: async () => items,
  });
  const skipFn = () => ({
    limit: limitFn,
  });
  rawFindChain.mockReturnValue({
    populate: () => ({
      sort: () => ({
        skip: opts?.noSkip ? () => ({ limit: limitFn }) : skipFn,
        limit: limitFn,
      }),
    }),
  });
}

describe('attendanceRawList.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rawCount.mockResolvedValue(0);
    mockRawFind([]);
  });

  it('filters by single date on rawDate', async () => {
    const filter = await buildRawPunchFilter({ date: '2026-06-02' });
    expect(filter).toEqual({ rawDate: '2026-06-02' });
  });

  it('filters by date range on rawDate', async () => {
    const filter = await buildRawPunchFilter({
      startDate: '2026-06-01',
      endDate: '2026-06-07',
    });
    expect(filter).toEqual({
      rawDate: { $gte: '2026-06-01', $lte: '2026-06-07' },
    });
  });

  it('adds punchType when provided', async () => {
    const filter = await buildRawPunchFilter({ punchType: 'IN' });
    expect(filter).toEqual({ punchType: 'IN' });
  });

  it('search resolves employees and matches biometricId regex', async () => {
    const empId = new Types.ObjectId();
    employeeFind.mockReturnValue({
      select: () => ({
        lean: async () => [{ _id: empId }],
      }),
    });

    const filter = await buildRawPunchFilter({ search: 'alice' });

    expect(employeeFind).toHaveBeenCalledWith({
      isDeleted: { $ne: true },
      $or: [
        { name: /alice/i },
        { empCode: /alice/i },
        { biometricId: /alice/i },
      ],
    });
    const orClause = filter.$or as Array<Record<string, unknown>>;
    expect(orClause).toHaveLength(2);
    expect(orClause[0]).toEqual({ employeeId: { $in: [empId] } });
    expect(orClause[1]).toEqual({ biometricId: /alice/i });
  });

  it('escapes regex special characters in search', async () => {
    employeeFind.mockReturnValue({
      select: () => ({
        lean: async () => [],
      }),
    });

    const filter = await buildRawPunchFilter({ search: 'a+b' });
    const orClause = filter.$or as Array<Record<string, unknown>>;
    expect(orClause[1]).toEqual({ biometricId: /a\+b/i });
  });

  it('listRawPunches paginates and returns totals', async () => {
    rawCount.mockResolvedValue(120);
    mockRawFind([{ _id: '1' }]);

    const result = await listRawPunches({ page: 2, pageSize: 50 });

    expect(rawCount).toHaveBeenCalled();
    expect(rawFindChain).toHaveBeenCalled();
    expect(result).toEqual({
      items: [{ _id: '1', assignedShift: undefined, shiftWindowLabel: undefined, outsideMainShift: null }],
      total: 120,
      page: 2,
      pageSize: 50,
    });
  });

  it('listRawPunches uses limit shortcut for live feed', async () => {
    rawCount.mockResolvedValue(3);
    mockRawFind([]);

    const result = await listRawPunches({ page: 5, pageSize: 100, limit: 50 });

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
  });

  it('listRawPunches filters outside-shift IN punches when outsideShiftOnly', async () => {
    rawCount.mockResolvedValue(2);
    mockRawFind(
      [
        {
          _id: '1',
          punchType: 'IN',
          rawTimestamp: new Date('2026-06-02T14:30:00.000Z'), // 20:00 IST — outside Day 06:00–18:00
          employeeId: { timeShift: 'Day', name: 'A', empCode: 'E1', department: 'Ops' },
        },
        {
          _id: '2',
          punchType: 'IN',
          rawTimestamp: new Date('2026-06-02T02:30:00.000Z'),
          employeeId: { timeShift: 'Day', name: 'B', empCode: 'E2', department: 'Ops' },
        },
        { _id: '3', punchType: 'OUT', rawTimestamp: new Date(), employeeId: { timeShift: 'Day' } },
      ],
      { noSkip: true }
    );

    const result = await listRawPunches({ outsideShiftOnly: true, page: 1, pageSize: 50 });

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?._id).toBe('1');
    expect(result.items[0]?.outsideMainShift).toBe(true);
  });
});
