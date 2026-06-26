import type { AttendanceRawListQuery } from '@mams/types';
import {
  findRealShiftWindow,
  formatShiftWindowLabel,
  isPunchOutsideRealShift,
  type ShiftWindowLike,
} from '@mams/types';
import { AttendanceRawModel } from '../models/AttendanceRaw.js';
import { EmployeeModel } from '../models/Employee.js';
import { SettingsModel } from '../models/Settings.js';
import { parseSortQuery } from '../utils/sortQuery.js';

const OUTSIDE_SHIFT_SCAN_CAP = 5000;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type PopulatedEmployee = {
  _id: unknown;
  name: string;
  empCode: string;
  department: string;
  timeShift?: 'Day' | 'Night';
};

type RawPunchDoc = Record<string, unknown> & {
  punchType: 'IN' | 'OUT' | 'OTHER';
  rawTimestamp: Date | string;
  employeeId?: PopulatedEmployee | null;
};

function enrichRawPunch(punch: RawPunchDoc, realShifts: ShiftWindowLike[]) {
  const emp = punch.employeeId;
  const assignedShift = emp?.timeShift;
  let shiftWindowLabel: string | undefined;

  if (assignedShift) {
    const window = findRealShiftWindow(assignedShift, realShifts);
    if (window) {
      shiftWindowLabel = formatShiftWindowLabel(window);
    }
  }

  let outsideMainShift: boolean | null = null;
  if (punch.punchType === 'IN') {
    if (emp && assignedShift) {
      const outside = isPunchOutsideRealShift(punch.rawTimestamp, assignedShift, realShifts);
      outsideMainShift = outside ?? false;
    }
  }

  return {
    ...punch,
    assignedShift,
    shiftWindowLabel,
    outsideMainShift,
  };
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

async function loadRealShifts(): Promise<ShiftWindowLike[]> {
  const settings = await SettingsModel.findOne().lean();
  return settings?.realShifts ?? [];
}

function employeeSortField(sortBy?: string): 'name' | 'empCode' | null {
  if (sortBy === 'name') return 'name';
  if (sortBy === 'empCode') return 'empCode';
  return null;
}

async function listRawWithEmployeeSort(
  filter: Record<string, unknown>,
  q: AttendanceRawListQuery,
  realShifts: ShiftWindowLike[],
  empField: 'name' | 'empCode'
) {
  const page = q.limit ? 1 : q.page;
  const pageSize = q.limit ? Math.min(q.limit, 200) : Math.min(q.pageSize, 200);
  const dir = q.sortDir === 'asc' ? 1 : -1;
  const skip = (page - 1) * pageSize;

  const [total, aggIds] = await Promise.all([
    AttendanceRawModel.countDocuments(filter),
    AttendanceRawModel.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'employees',
          localField: 'employeeId',
          foreignField: '_id',
          as: 'emp',
        },
      },
      { $unwind: { path: '$emp', preserveNullAndEmptyArrays: true } },
      { $sort: { [`emp.${empField}`]: dir, rawTimestamp: -1 } },
      { $skip: skip },
      { $limit: pageSize },
      { $project: { _id: 1 } },
    ]),
  ]);

  const ids = aggIds.map((d) => d._id);
  const rawItems = await AttendanceRawModel.find({ _id: { $in: ids } })
    .populate('employeeId', 'name empCode department timeShift')
    .lean();
  const byId = new Map(rawItems.map((d) => [String(d._id), d]));
  const items = ids
    .map((id) => byId.get(String(id)))
    .filter(Boolean)
    .map((p) => enrichRawPunch(p as unknown as RawPunchDoc, realShifts));

  return { items, total, page, pageSize };
}

export async function listRawPunches(q: AttendanceRawListQuery) {
  const filter = await buildRawPunchFilter(q);
  const realShifts = await loadRealShifts();

  const page = q.limit ? 1 : q.page;
  const pageSize = q.limit ? Math.min(q.limit, 200) : Math.min(q.pageSize, 200);

  if (q.outsideShiftOnly) {
    const baseTotal = await AttendanceRawModel.countDocuments(filter);
    const scanLimit = Math.min(baseTotal, OUTSIDE_SHIFT_SCAN_CAP);
    const truncated = baseTotal > OUTSIDE_SHIFT_SCAN_CAP;

    const rawItems = await AttendanceRawModel.find(filter)
      .populate('employeeId', 'name empCode department timeShift')
      .sort({ rawTimestamp: -1 })
      .limit(scanLimit)
      .lean();

    let flagged = rawItems
      .map((p) => enrichRawPunch(p as unknown as RawPunchDoc, realShifts))
      .filter((p) => p.punchType === 'IN' && p.outsideMainShift === true);

    const empField = employeeSortField(q.sortBy);
    if (empField) {
      const dir = q.sortDir === 'asc' ? 1 : -1;
      flagged = [...flagged].sort((a, b) => {
        const av = a.employeeId?.[empField] ?? '';
        const bv = b.employeeId?.[empField] ?? '';
        return dir * String(av).localeCompare(String(bv));
      });
    } else if (q.sortBy === 'punchType') {
      const dir = q.sortDir === 'asc' ? 1 : -1;
      flagged = [...flagged].sort((a, b) => dir * String(a.punchType).localeCompare(String(b.punchType)));
    } else if (q.sortBy === 'rawTimestamp') {
      const dir = q.sortDir === 'asc' ? 1 : -1;
      flagged = [...flagged].sort(
        (a, b) => dir * (new Date(String(a.rawTimestamp)).getTime() - new Date(String(b.rawTimestamp)).getTime())
      );
    }

    const total = flagged.length;
    const start = (page - 1) * pageSize;
    const items = flagged.slice(start, start + pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      ...(truncated ? { truncated: true } : {}),
    };
  }

  const empField = employeeSortField(q.sortBy);
  if (empField) {
    return listRawWithEmployeeSort(filter, q, realShifts, empField);
  }

  const sort = parseSortQuery(q.sortBy, q.sortDir, {
    rawTimestamp: 'rawTimestamp',
    punchType: 'punchType',
  }, { rawTimestamp: -1 });

  const [total, items] = await Promise.all([
    AttendanceRawModel.countDocuments(filter),
    AttendanceRawModel.find(filter)
      .populate('employeeId', 'name empCode department timeShift')
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
  ]);

  return {
    items: items.map((p) => enrichRawPunch(p as unknown as RawPunchDoc, realShifts)),
    total,
    page,
    pageSize,
  };
}
