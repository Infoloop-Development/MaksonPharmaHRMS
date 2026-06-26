import type { ComplianceShift, SortDir } from '@mams/types';
import { compareComplianceShift } from '@mams/types';
import { ComplianceGeneratedAttendanceModel } from '../models/ComplianceGeneratedAttendance.js';
import { EmployeeModel } from '../models/Employee.js';

export interface ListComplianceAttendanceQuery {
  date?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  alternateShift?: ComplianceShift;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDir?: SortDir;
}

type ComplianceRow = {
  date: string;
  alternateShift?: ComplianceShift;
  checkInAt?: Date | string;
  hoursWorked: number;
  status: string;
  employeeId?: {
    name?: string;
    empCode?: string;
    department?: string;
  } | null;
};

function compareSortValues(a: unknown, b: unknown, dir: SortDir, type: 'string' | 'number' | 'date' = 'string'): number {
  const mult = dir === 'asc' ? 1 : -1;
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (type === 'number') {
    return mult * (Number(a) - Number(b));
  }
  if (type === 'date') {
    return mult * (new Date(String(a)).getTime() - new Date(String(b)).getTime());
  }
  return mult * String(a).localeCompare(String(b));
}

function sortComplianceRows(rows: ComplianceRow[], sortBy?: string, sortDir: SortDir = 'asc') {
  if (!sortBy) {
    rows.sort((a, b) => {
      const shiftCmp = compareComplianceShift(
        (a.alternateShift ?? 'A') as ComplianceShift,
        (b.alternateShift ?? 'A') as ComplianceShift
      );
      if (shiftCmp !== 0) return shiftCmp;
      const aIn = a.checkInAt ? new Date(a.checkInAt).getTime() : 0;
      const bIn = b.checkInAt ? new Date(b.checkInAt).getTime() : 0;
      return aIn - bIn;
    });
    return;
  }

  const getters: Record<string, { get: (r: ComplianceRow) => unknown; type?: 'string' | 'number' | 'date' }> = {
    date: { get: (r) => r.date, type: 'date' },
    name: { get: (r) => r.employeeId?.name },
    empCode: { get: (r) => r.employeeId?.empCode },
    department: { get: (r) => r.employeeId?.department },
    alternateShift: { get: (r) => r.alternateShift },
    hoursWorked: { get: (r) => r.hoursWorked, type: 'number' },
    status: { get: (r) => r.status },
  };

  const spec = getters[sortBy];
  if (!spec) return;

  rows.sort((a, b) => compareSortValues(spec.get(a), spec.get(b), sortDir, spec.type));
}

export async function listComplianceGeneratedAttendance(q: ListComplianceAttendanceQuery) {
  const filter: Record<string, unknown> = {};

  if (q.date) {
    filter.date = q.date;
  } else if (q.startDate || q.endDate) {
    filter.date = {
      ...(q.startDate ? { $gte: q.startDate } : {}),
      ...(q.endDate ? { $lte: q.endDate } : {}),
    };
  }

  if (q.alternateShift) {
    filter.alternateShift = q.alternateShift;
  }

  if (q.search?.trim()) {
    const re = new RegExp(q.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const emps = await EmployeeModel.find({
      $or: [{ name: re }, { empCode: re }, { department: re }],
    })
      .select('_id')
      .lean();
    filter.employeeId = { $in: emps.map((e) => e._id) };
  }

  const statsFilter = { ...filter };
  delete statsFilter.alternateShift;

  const allForStats = await ComplianceGeneratedAttendanceModel.find(statsFilter)
    .select('alternateShift')
    .lean();

  const byShift: Record<ComplianceShift, number> = { A: 0, B: 0, C: 0 };
  for (const row of allForStats) {
    const shift = (row.alternateShift ?? 'A') as ComplianceShift;
    byShift[shift] += 1;
  }

  const all = await ComplianceGeneratedAttendanceModel.find(filter)
    .populate('employeeId', 'name empCode department alternateShift')
    .lean();

  sortComplianceRows(all as ComplianceRow[], q.sortBy, q.sortDir ?? 'asc');

  const total = all.length;
  const start = (q.page - 1) * q.pageSize;
  const items = all.slice(start, start + q.pageSize);

  return {
    items,
    total,
    page: q.page,
    pageSize: q.pageSize,
    stats: { total: allForStats.length, byShift },
  };
}
