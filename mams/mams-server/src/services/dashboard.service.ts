import { EmployeeModel } from '../models/Employee.js';
import { AttendanceDerivedModel } from '../models/AttendanceDerived.js';
import { utcToIstDateString, utcToIstTimeString } from '../utils/time.js';

const DAY_LATE_AFTER_MINUTES = 9 * 60 + 15; // 09:15 IST
const NIGHT_LATE_FROM_MINUTES = 20 * 60; // 20:00 IST

export interface DashboardChartsPayload {
  asOfDate: string;
  last5Days: {
    dates: string[];
    totalEmployees: number;
    present: number[];
  };
  todayPunctuality: {
    onTime: number;
    delay: number;
    onLeave: number;
    totalActive: number;
  };
}

function lastNIstDates(n: number): string[] {
  const dates: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    dates.push(utcToIstDateString(new Date(Date.now() - i * 24 * 60 * 60 * 1000)));
  }
  return dates;
}

function istMinutesFromMidnight(d: Date): number {
  const t = utcToIstTimeString(d);
  const parts = t.split(':').map((x) => parseInt(x, 10));
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  return h * 60 + m;
}

export function isLateEntry(realEntryAt: Date, timeShift: 'Day' | 'Night'): boolean {
  const minutes = istMinutesFromMidnight(realEntryAt);
  if (timeShift === 'Day') return minutes > DAY_LATE_AFTER_MINUTES;
  return minutes >= NIGHT_LATE_FROM_MINUTES;
}

export async function getDashboardCharts(): Promise<DashboardChartsPayload> {
  const asOfDate = utcToIstDateString(new Date());
  const dates = lastNIstDates(5);

  const totalActive = await EmployeeModel.countDocuments({
    status: 'Active',
    isDeleted: { $ne: true },
  });

  const presentRows = await AttendanceDerivedModel.aggregate([
    { $match: { date: { $in: dates }, status: 'Present' } },
    { $group: { _id: '$date', count: { $sum: 1 } } },
  ]);
  const presentByDate = new Map(presentRows.map((r) => [r._id as string, r.count as number]));
  const present = dates.map((d) => presentByDate.get(d) ?? 0);

  const onLeave = await AttendanceDerivedModel.countDocuments({
    date: asOfDate,
    status: { $in: ['Absent', 'Weekly Off', 'Half Day'] },
  });

  const presentToday = await AttendanceDerivedModel.aggregate([
    {
      $match: {
        date: asOfDate,
        status: 'Present',
      },
    },
    {
      $lookup: {
        from: 'employees',
        localField: 'employeeId',
        foreignField: '_id',
        as: 'emp',
      },
    },
    { $unwind: '$emp' },
    {
      $project: {
        realEntryAt: 1,
        timeShift: '$emp.timeShift',
      },
    },
  ]);

  let delay = 0;
  let onTime = 0;
  for (const row of presentToday) {
    const entry = row.realEntryAt as Date | null;
    const shift = row.timeShift as 'Day' | 'Night';
    if (entry && isLateEntry(entry, shift)) delay += 1;
    else onTime += 1;
  }

  return {
    asOfDate,
    last5Days: {
      dates,
      totalEmployees: totalActive,
      present,
    },
    todayPunctuality: {
      onTime,
      delay,
      onLeave,
      totalActive,
    },
  };
}
