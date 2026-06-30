import { EmployeeModel } from '../models/Employee.js';
import { AttendanceDerivedModel } from '../models/AttendanceDerived.js';
import { utcToIstDateString, utcToIstTimeString } from '../utils/time.js';

const DAY_LATE_AFTER_MINUTES = 9 * 60 + 15; // 09:15 IST
const NIGHT_LATE_FROM_MINUTES = 20 * 60; // 20:00 IST

export interface DashboardChartsPayload {
  asOfDate: string;
  weekRange: { start: string; end: string };
  last7Days: {
    dates: string[];
    totalEmployees: number;
    present: number[];
    absent: number[];
    late: number[];
    weeklyOff: number[];
    halfDay: number[];
    dayShiftPresent: number[];
    nightShiftPresent: number[];
  };
  weekPunctuality: {
    /** IST date this breakdown applies to (matches selected bar / table day). */
    date: string;
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

const COMPLIANT_LATE_AFTER: Record<'A' | 'B' | 'C', number> = {
  A: 6 * 60 + 15,   // 06:15 IST
  B: 14 * 60 + 15,  // 14:15 IST
  C: 22 * 60 + 15,  // 22:15 IST
};

export function isCompliantLateEntry(compliantEntryAt: Date, alternateShift: 'A' | 'B' | 'C'): boolean {
  return istMinutesFromMidnight(compliantEntryAt) > COMPLIANT_LATE_AFTER[alternateShift];
}

async function getDayPunctuality(date: string, totalActive: number, viewMode: 'real' | 'compliant' = 'real') {
  const onLeave = await AttendanceDerivedModel.countDocuments({
    date,
    status: { $in: ['Absent', 'Weekly Off', 'Half Day'] },
  });

  if (viewMode === 'compliant') {
    const presentRows = await AttendanceDerivedModel.aggregate([
      { $match: { date, status: 'Present' } },
      { $lookup: { from: 'employees', localField: 'employeeId', foreignField: '_id', as: 'emp' } },
      { $unwind: '$emp' },
      { $project: { compliantEntryAt: 1, alternateShift: '$emp.alternateShift' } },
    ]);
    let delay = 0;
    for (const row of presentRows) {
      if (row.compliantEntryAt && isCompliantLateEntry(row.compliantEntryAt as Date, row.alternateShift as 'A' | 'B' | 'C')) {
        delay += 1;
      }
    }
    return { date, onTime: Math.max(0, totalActive - onLeave - delay), delay, onLeave, totalActive };
  }

  const presentDay = await AttendanceDerivedModel.aggregate([
    { $match: { date, status: 'Present' } },
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
  for (const row of presentDay) {
    const entry = row.realEntryAt as Date | null;
    const shift = row.timeShift as 'Day' | 'Night';
    if (entry && isLateEntry(entry, shift)) delay += 1;
    else onTime += 1;
  }

  return { date, onTime, delay, onLeave, totalActive };
}

async function countStatusByDate(dates: string[], status: string): Promise<number[]> {
  const rows = await AttendanceDerivedModel.aggregate([
    { $match: { date: { $in: dates }, status } },
    { $group: { _id: '$date', count: { $sum: 1 } } },
  ]);
  const byDate = new Map(rows.map((r) => [r._id as string, r.count as number]));
  return dates.map((d) => byDate.get(d) ?? 0);
}

async function countPresentByShift(dates: string[], shift: 'Day' | 'Night'): Promise<number[]> {
  const rows = await AttendanceDerivedModel.aggregate([
    { $match: { date: { $in: dates }, status: 'Present' } },
    {
      $lookup: {
        from: 'employees',
        localField: 'employeeId',
        foreignField: '_id',
        as: 'emp',
      },
    },
    { $unwind: '$emp' },
    { $match: { 'emp.timeShift': shift } },
    { $group: { _id: '$date', count: { $sum: 1 } } },
  ]);
  const byDate = new Map(rows.map((r) => [r._id as string, r.count as number]));
  return dates.map((d) => byDate.get(d) ?? 0);
}

async function countPresentByAlternateShift(dates: string[], shift: 'A' | 'B' | 'C'): Promise<number[]> {
  const rows = await AttendanceDerivedModel.aggregate([
    { $match: { date: { $in: dates }, status: 'Present' } },
    { $lookup: { from: 'employees', localField: 'employeeId', foreignField: '_id', as: 'emp' } },
    { $unwind: '$emp' },
    { $match: { 'emp.alternateShift': shift } },
    { $group: { _id: '$date', count: { $sum: 1 } } },
  ]);
  const byDate = new Map(rows.map((r) => [r._id as string, r.count as number]));
  return dates.map((d) => byDate.get(d) ?? 0);
}

async function countPresentByAlternateShiftMultiple(dates: string[], shifts: ('A' | 'B' | 'C')[]): Promise<number[]> {
  const rows = await AttendanceDerivedModel.aggregate([
    { $match: { date: { $in: dates }, status: 'Present' } },
    { $lookup: { from: 'employees', localField: 'employeeId', foreignField: '_id', as: 'emp' } },
    { $unwind: '$emp' },
    { $match: { 'emp.alternateShift': { $in: shifts } } },
    { $group: { _id: '$date', count: { $sum: 1 } } },
  ]);
  const byDate = new Map(rows.map((r) => [r._id as string, r.count as number]));
  return dates.map((d) => byDate.get(d) ?? 0);
}


export async function getDashboardCharts(punctualityDate?: string, viewMode: 'real' | 'compliant' = 'real'): Promise<DashboardChartsPayload> {
  const asOfDate = utcToIstDateString(new Date());
  const dates = lastNIstDates(7);
  const punctualityFor = punctualityDate && dates.includes(punctualityDate)
    ? punctualityDate
    : dates[dates.length - 1]!;

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

  const absentRows = await AttendanceDerivedModel.aggregate([
    { $match: { date: { $in: dates }, status: 'Absent' } },
    { $group: { _id: '$date', count: { $sum: 1 } } },
  ]);
  const absentByDate = new Map(absentRows.map((r) => [r._id as string, r.count as number]));
  const absent = dates.map((d) => absentByDate.get(d) ?? 0);

const late = await (async () => {
  const presentForLate = await AttendanceDerivedModel.aggregate([
    { $match: { date: { $in: dates }, status: 'Present' } },
    { $lookup: { from: 'employees', localField: 'employeeId', foreignField: '_id', as: 'emp' } },
    { $unwind: '$emp' },
    { $project: { date: 1, realEntryAt: 1, compliantEntryAt: 1, timeShift: '$emp.timeShift', alternateShift: '$emp.alternateShift' } },
  ]);
  const lateByDate = new Map(dates.map((d) => [d, 0]));
  for (const row of presentForLate) {
    const isLate = viewMode === 'compliant'
      ? (row.compliantEntryAt && isCompliantLateEntry(row.compliantEntryAt as Date, row.alternateShift as 'A' | 'B' | 'C'))
      : (row.realEntryAt && isLateEntry(row.realEntryAt as Date, row.timeShift as 'Day' | 'Night'));
    if (isLate) {
      lateByDate.set(row.date as string, (lateByDate.get(row.date as string) ?? 0) + 1);
    }
  }
  return dates.map((d) => lateByDate.get(d) ?? 0);
})();


  const [weeklyOff, halfDay, dayShiftPresent, nightShiftPresent] = await Promise.all([
    countStatusByDate(dates, 'Weekly Off'),
    countStatusByDate(dates, 'Half Day'),
    viewMode === 'compliant' 
    ? countPresentByAlternateShift(dates,'A') : countPresentByShift(dates,'Day'),
    viewMode === 'compliant' 
    ? countPresentByAlternateShiftMultiple(dates,['B','C']) : countPresentByShift(dates,'Night'),
  ]);

  const weekPunctuality = await getDayPunctuality(punctualityFor, totalActive, viewMode);

  return {
    asOfDate,
    weekRange: { start: dates[0]!, end: dates[dates.length - 1]! },
    last7Days: {
      dates,
      totalEmployees: totalActive,
      present,
      absent,
      late,
      weeklyOff,
      halfDay,
      dayShiftPresent,
      nightShiftPresent,
    },
    weekPunctuality,
  };
}
