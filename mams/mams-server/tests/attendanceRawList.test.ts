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

const { buildRawPunchFilter, listRawPunches } = await import(
  '../src/services/attendanceRawList.service.js'
);

function mockRawFind(items: unknown[] = []) {
  rawFindChain.mockReturnValue({
    populate: () => ({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: async () => items,
          }),
        }),
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
      items: [{ _id: '1' }],
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
});
