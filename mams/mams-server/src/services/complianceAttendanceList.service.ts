import type { ComplianceShift } from '@mams/types';
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

  all.sort((a, b) => {
    const shiftCmp = compareComplianceShift(
      (a.alternateShift ?? 'A') as ComplianceShift,
      (b.alternateShift ?? 'A') as ComplianceShift
    );
    if (shiftCmp !== 0) return shiftCmp;
    const aIn = a.checkInAt ? new Date(a.checkInAt).getTime() : 0;
    const bIn = b.checkInAt ? new Date(b.checkInAt).getTime() : 0;
    return aIn - bIn;
  });

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
