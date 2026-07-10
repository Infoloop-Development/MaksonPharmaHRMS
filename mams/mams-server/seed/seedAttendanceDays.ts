/**
 * Backfill attendance for the last N IST days (default 10) through today.
 * Does not wipe employees, users, or devices — only replaces attendance for those dates.
 *
 * Run: npm run seed:attendance
 * Env: SEED_ATTENDANCE_DAYS (default 10)
 */
import { fromZonedTime } from 'date-fns-tz';
import type { Types } from 'mongoose';
import { connectDb, disconnectDb } from '../src/config/db.js';
import { EmployeeModel } from '../src/models/Employee.js';
import { AttendanceRawModel } from '../src/models/AttendanceRaw.js';
import { AttendanceDerivedModel } from '../src/models/AttendanceDerived.js';
import { LeaveApplicationModel } from '../src/models/LeaveApplication.js';
import { recomputeDerived } from '../src/services/attendance.service.js';
import { hashString, seededRandom } from '../src/utils/prng.js';
import { logger } from '../src/utils/logger.js';
import { buildLastNSeedDays } from './seedDateRanges.js';

const IST = 'Asia/Kolkata';
// Monday = 0 … Sunday = 6 — matches day.weekdayIdx from dayIdxFromDateString (seedDateRanges.ts).
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

const ABS_RATES = [0.09, 0.065, 0.055, 0.07, 0.11, 0.16, 0.22];
const LATE_RATES = [0.15, 0.10, 0.09, 0.11, 0.14, 0.07, 0.05];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

async function main() {
  const dayCount = Number(process.env.SEED_ATTENDANCE_DAYS || 10);
  if (!Number.isFinite(dayCount) || dayCount < 1 || dayCount > 90) {
    throw new Error('SEED_ATTENDANCE_DAYS must be between 1 and 90');
  }

  await connectDb();
  const now = new Date();
  const days = buildLastNSeedDays(dayCount, now);
  const dateStrings = days.map((d) => d.date);

  logger.info('Attendance backfill starting', {
    dayCount,
    from: dateStrings[0],
    to: dateStrings[dateStrings.length - 1],
  });

  const empDocs = await EmployeeModel.find({ status: 'Active' }).lean();
  if (empDocs.length === 0) {
    throw new Error('No active employees found — run npm run seed first');
  }

  // Approved full-day leave always wins - don't fabricate punches for someone on
  // leave, otherwise the Leave module says "absent" while the raw punch feed and
  // Attendance show them clocking in for a full shift the same day.
  const approvedLeaves = await LeaveApplicationModel.find({
    status: 'Approved',
    halfDayPortion: null,
    fromDate: { $lte: dateStrings[dateStrings.length - 1] },
    toDate: { $gte: dateStrings[0] },
  })
    .select('employeeId fromDate toDate')
    .lean();

  const leaveDatesByEmployee = new Map<string, Set<string>>();
  for (const leave of approvedLeaves) {
    const empKey = String(leave.employeeId);
    let dates = leaveDatesByEmployee.get(empKey);
    if (!dates) {
      dates = new Set();
      leaveDatesByEmployee.set(empKey, dates);
    }
    for (const d of dateStrings) {
      if (d >= leave.fromDate && d <= leave.toDate) dates.add(d);
    }
  }

  await AttendanceRawModel.collection.deleteMany({ rawDate: { $in: dateStrings } });
  await AttendanceDerivedModel.deleteMany({ date: { $in: dateStrings } });
  logger.info('Cleared existing attendance for target dates');

  let rawTotal = 0;
  for (const day of days) {
    const rawBatch: Record<string, unknown>[] = [];
    for (const emp of empDocs) {
      const isWeeklyOff = (emp.weeklyOff ?? []).includes(WEEKDAY_NAMES[day.weekdayIdx]!);
      if (isWeeklyOff) continue;
      if (leaveDatesByEmployee.get(String(emp._id))?.has(day.date)) continue;

      const r = seededRandom(hashString(`${emp.empCode}:${day.date}`));
      const isAbsent = r() < (ABS_RATES[day.weekdayIdx] ?? 0.1);
      if (isAbsent) continue;

      const isLate = r() < (LATE_RATES[day.weekdayIdx] ?? 0.12);
      const isDay = emp.timeShift === 'Day';
      let bH: number;
      let bM: number;
      let bS: number;
      if (isDay) {
        if (isLate) {
          bH = 9 + Math.floor(r() * 2);
          bM = Math.floor(r() * 45) + 15;
        } else {
          bH = 6 + Math.floor(r() * 3);
          bM = Math.floor(r() * 55);
        }
        bS = Math.floor(r() * 60);
      } else {
        if (isLate) {
          bH = 20 + Math.floor(r() * 2);
          bM = Math.floor(r() * 40) + 20;
        } else {
          bH = 18 + Math.floor(r() * 2);
          bM = Math.floor(r() * 50);
        }
        bS = Math.floor(r() * 60);
      }
      const shiftLen = 7.5 + r() * 3.0;
      const xH = bH + Math.floor(shiftLen);
      const xM = Math.floor((shiftLen % 1) * 60);

      const entryIst = `${day.date}T${pad(bH)}:${pad(bM)}:${pad(bS)}`;
      const exitIst = `${day.date}T${pad(xH % 24)}:${pad(xM)}:00`;
      const entryUtc = fromZonedTime(entryIst, IST);
      const exitUtc = fromZonedTime(exitIst, IST);

      rawBatch.push(
        {
          employeeId: emp._id,
          biometricId: emp.biometricId,
          deviceId: null,
          punchType: 'IN',
          rawTimestamp: entryUtc,
          rawDate: day.date,
          rawPayload: { source: 'seed:attendance-days' },
          receivedAt: now,
          sourceIp: '127.0.0.1',
        },
        {
          employeeId: emp._id,
          biometricId: emp.biometricId,
          deviceId: null,
          punchType: 'OUT',
          rawTimestamp: exitUtc,
          rawDate: day.date,
          rawPayload: { source: 'seed:attendance-days' },
          receivedAt: now,
          sourceIp: '127.0.0.1',
        }
      );
    }
    if (rawBatch.length > 0) {
      await AttendanceRawModel.insertMany(rawBatch, { ordered: false });
      rawTotal += rawBatch.length;
    }
  }
  logger.info(`Inserted ${rawTotal} raw attendance records`);

  const empIds = empDocs.map((e) => e._id);
  let derivedCount = 0;
  const batchSize = 200;
  for (const day of days) {
    for (let i = 0; i < empIds.length; i += batchSize) {
      const slice = empIds.slice(i, i + batchSize);
      await Promise.all(slice.map((id) => recomputeDerived(id as Types.ObjectId, day.date, 'seed:attendance-days')));
      derivedCount += slice.length;
    }
  }

  logger.info('Attendance backfill complete', {
    days: days.length,
    employees: empIds.length,
    rawRecords: rawTotal,
    derivedRecomputed: derivedCount,
    from: dateStrings[0],
    to: dateStrings[dateStrings.length - 1],
  });

  await disconnectDb();
}

main().catch((err) => {
  logger.error('Attendance backfill failed', { err: String(err) });
  process.exit(1);
});
