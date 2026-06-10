import type { AttendanceRawStats, AttendanceRawStatsQuery } from '@mams/types';
import { AttendanceRawModel } from '../models/AttendanceRaw.js';
import { utcToIstDateString } from '../utils/time.js';
import { buildRawPunchFilter } from './attendanceRawList.service.js';

type StatsAggRow = {
  _id: null;
  total: number;
  in: number;
  out: number;
  other: number;
  employeeIds: unknown[];
};

function resolveScope(
  q: AttendanceRawStatsQuery
): Pick<AttendanceRawStats, 'scope' | 'scopeDate'> {
  if (q.date) {
    return { scope: 'date', scopeDate: q.date };
  }
  if (q.startDate || q.endDate) {
    return { scope: 'range', scopeDate: q.startDate ?? q.endDate };
  }
  if (q.search?.trim()) {
    return { scope: 'all' };
  }
  const today = utcToIstDateString(new Date());
  return { scope: 'today', scopeDate: today };
}

export async function getRawPunchStats(q: AttendanceRawStatsQuery): Promise<AttendanceRawStats> {
  const scopeMeta = resolveScope(q);
  const filterInput = { ...q };

  if (scopeMeta.scope === 'today' && scopeMeta.scopeDate) {
    filterInput.date = scopeMeta.scopeDate;
  }

  const filter = await buildRawPunchFilter(filterInput);

  const [agg] = await AttendanceRawModel.aggregate<StatsAggRow>([
    { $match: filter },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        in: { $sum: { $cond: [{ $eq: ['$punchType', 'IN'] }, 1, 0] } },
        out: { $sum: { $cond: [{ $eq: ['$punchType', 'OUT'] }, 1, 0] } },
        other: { $sum: { $cond: [{ $eq: ['$punchType', 'OTHER'] }, 1, 0] } },
        employeeIds: { $addToSet: '$employeeId' },
      },
    },
  ]);

  const employeeIds = agg?.employeeIds ?? [];
  const uniqueEmployees = employeeIds.filter((id) => id != null).length;

  return {
    total: agg?.total ?? 0,
    in: agg?.in ?? 0,
    out: agg?.out ?? 0,
    other: agg?.other ?? 0,
    uniqueEmployees,
    scope: scopeMeta.scope,
    scopeDate: scopeMeta.scopeDate,
  };
}
