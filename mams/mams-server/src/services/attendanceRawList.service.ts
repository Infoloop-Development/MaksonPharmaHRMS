import type { AttendanceRawListQuery } from '@mams/types';
import { AttendanceRawModel } from '../models/AttendanceRaw.js';
import { EmployeeModel } from '../models/Employee.js';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function buildRawPunchFilter(
  q: Pick<AttendanceRawListQuery, 'search' | 'date' | 'startDate' | 'endDate' | 'punchType'>
): Promise<Record<string, unknown>> {
  const filter: Record<string, unknown> = {};

  if (q.date) {
    filter.rawDate = q.date;
  } else if (q.startDate || q.endDate) {
    filter.rawDate = {
      ...(q.startDate ? { $gte: q.startDate } : {}),
      ...(q.endDate ? { $lte: q.endDate } : {}),
    };
  }

  if (q.punchType) {
    filter.punchType = q.punchType;
  }

  const term = q.search?.trim();
  if (term) {
    const re = new RegExp(escapeRegex(term), 'i');
    const employees = await EmployeeModel.find({
      isDeleted: { $ne: true },
      $or: [{ name: re }, { empCode: re }, { biometricId: re }],
    })
      .select('_id')
      .lean();
    const ids = employees.map((e) => e._id);
    filter.$or = [{ employeeId: { $in: ids } }, { biometricId: re }];
  }

  return filter;
}

export async function listRawPunches(q: AttendanceRawListQuery) {
  const filter = await buildRawPunchFilter(q);

  const page = q.limit ? 1 : q.page;
  const pageSize = q.limit ? Math.min(q.limit, 200) : Math.min(q.pageSize, 200);

  const [total, items] = await Promise.all([
    AttendanceRawModel.countDocuments(filter),
    AttendanceRawModel.find(filter)
      .populate('employeeId', 'name empCode department')
      .sort({ rawTimestamp: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
  ]);

  return { items, total, page, pageSize };
}
