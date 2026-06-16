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



    const flagged = rawItems

      .map((p) => enrichRawPunch(p as unknown as RawPunchDoc, realShifts))

      .filter((p) => p.punchType === 'IN' && p.outsideMainShift === true);



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



  const [total, items] = await Promise.all([

    AttendanceRawModel.countDocuments(filter),

    AttendanceRawModel.find(filter)

      .populate('employeeId', 'name empCode department timeShift')

      .sort({ rawTimestamp: -1 })

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


