/**
 * Backfill attendance for the last N IST days (default 7) through an end date (default today).
 * Does not wipe employees, users, or devices — only replaces attendance for those dates.
 *
 * Run: npm run seed:attendance
 * Env:
 *   SEED_ATTENDANCE_DAYS (default 7) — number of days to seed
 *   SEED_ATTENDANCE_END_DATE (optional, YYYY-MM-DD) — last day inclusive, e.g. 2026-07-10
 */
import type { Types } from 'mongoose';
import { connectDb, disconnectDb } from '../src/config/db.js';
import { EmployeeModel } from '../src/models/Employee.js';
import { AttendanceRawModel } from '../src/models/AttendanceRaw.js';
import { AttendanceDerivedModel } from '../src/models/AttendanceDerived.js';
import { LeaveApplicationModel } from '../src/models/LeaveApplication.js';
import { recomputeDerived } from '../src/services/attendance.service.js';
import { hashString, seededRandom } from '../src/utils/prng.js';
import { utcToIstDateString } from '../src/utils/time.js';
import { logger } from '../src/utils/logger.js';
import { buildLastNSeedDaysEnding } from './seedDateRanges.js';
import { buildSeedPunchesForEmployee } from './attendancePunchGenerator.js';

// Monday = 0 … Sunday = 6 — matches day.weekdayIdx from dayIdxFromDateString (seedDateRanges.ts).
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

function resolveEndDate(): string {
  const fromEnv = process.env.SEED_ATTENDANCE_END_DATE?.trim();
  if (fromEnv && /^\d{4}-\d{2}-\d{2}$/.test(fromEnv)) return fromEnv;
  return utcToIstDateString(new Date());
}

async function main() {
  const dayCount = Number(process.env.SEED_ATTENDANCE_DAYS || 7);
  if (!Number.isFinite(dayCount) || dayCount < 1 || dayCount > 90) {
    throw new Error('SEED_ATTENDANCE_DAYS must be between 1 and 90');
  }

  const endDate = resolveEndDate();
  const days = buildLastNSeedDaysEnding(endDate, dayCount);
  const dateStrings = days.map((d) => d.date);

  await connectDb();
  const now = new Date();

  logger.info('Attendance backfill starting', {
    dayCount,
    endDate,
    from: dateStrings[0],
    to: dateStrings[dateStrings.length - 1],
  });

  const empDocs = await EmployeeModel.find({ status: 'Active' }).lean();
  if (empDocs.length === 0) {
    throw new Error('No active employees found — run npm run seed first');
  }

  const dayShiftCount = empDocs.filter((e) => e.timeShift === 'Day').length;
  const nightShiftCount = empDocs.length - dayShiftCount;
  logger.info('Employee shift mix', {
    active: empDocs.length,
    dayShift: dayShiftCount,
    nightShift: nightShiftCount,
  });

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
  const source = 'seed:attendance-days';

  for (const day of days) {
    const rawBatch: Record<string, unknown>[] = [];
    for (const emp of empDocs) {
      const isWeeklyOff = (emp.weeklyOff ?? []).includes(WEEKDAY_NAMES[day.weekdayIdx]!);
      if (isWeeklyOff) continue;
      if (leaveDatesByEmployee.get(String(emp._id))?.has(day.date)) continue;

      const r = seededRandom(hashString(`${emp.empCode}:${day.date}`));
      const punches = buildSeedPunchesForEmployee({
        employeeId: emp._id as Types.ObjectId,
        biometricId: emp.biometricId,
        empCode: emp.empCode,
        timeShift: emp.timeShift === 'Night' ? 'Night' : 'Day',
        date: day.date,
        weekdayIdx: day.weekdayIdx,
        receivedAt: now,
        source,
        r,
      });
      if (punches) rawBatch.push(...punches);
    }
    if (rawBatch.length > 0) {
      await AttendanceRawModel.insertMany(rawBatch, { ordered: false });
      rawTotal += rawBatch.length;
    }
  }
  logger.info(`Inserted ${rawTotal} raw attendance records`);

  const empIds = empDocs.map((e) => e._id);
  let derivedCount = 0;
  const batchSize = 30;
  for (const day of days) {
    for (let i = 0; i < empIds.length; i += batchSize) {
      const slice = empIds.slice(i, i + batchSize);
      await Promise.all(slice.map((id) => recomputeDerived(id as Types.ObjectId, day.date, source)));
      derivedCount += slice.length;
      if (derivedCount % 600 === 0 || i + batchSize >= empIds.length) {
        logger.info('Derived recompute progress', {
          date: day.date,
          done: Math.min(i + batchSize, empIds.length),
          total: empIds.length,
        });
      }
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
