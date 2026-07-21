import type { Types } from 'mongoose';
import { AttendanceRawModel } from '../models/AttendanceRaw.js';
import { AttendanceDerivedModel } from '../models/AttendanceDerived.js';
import { EmployeeModel, type EmployeeDoc } from '../models/Employee.js';
import { SettingsModel } from '../models/Settings.js';
import { LeaveApplicationModel } from '../models/LeaveApplication.js';
import { decomposeHours, smartAnchorV3 } from './smartAnchor.js';
import { istHourUtc, utcToIstDateString, addIstCalendarDays } from '../utils/time.js';
import type { ComplianceShift } from '@mams/types';

// Cutover hour (IST) per shift, chosen with margin outside that shift's own punch
// window - even the latest-entry + longest-shift case never lands here.
const SHIFT_CUTOVER_HOUR: Record<'Day' | 'Night', number> = { Day: 4, Night: 12 };

/** Which "shift day" a punch belongs to - before the cutover, it's yesterday's shift
 * spilling past midnight, not today's. */
export function shiftDayFor(timeShift: 'Day' | 'Night', rawTimestamp: Date): string {
  const dateStr = utcToIstDateString(rawTimestamp);
  const cutover = istHourUtc(dateStr, SHIFT_CUTOVER_HOUR[timeShift]);
  return rawTimestamp < cutover ? addIstCalendarDays(dateStr, -1) : dateStr;
}

/** Raw-punch window for a shift day: [cutover, cutover + 24h). */
function shiftDayWindow(date: string, timeShift: 'Day' | 'Night'): { start: Date; end: Date } {
  const start = istHourUtc(date, SHIFT_CUTOVER_HOUR[timeShift]);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

/**
 * Recompute attendance_derived for a given (employeeId, date) pair, where `date` is
 * the shift day (see shiftDayFor), not necessarily the calendar date every punch in
 * the shift literally falls on.
 * Called whenever new raw punches arrive for a day or an adjustment is approved.
 *
 * Pure function over the raw collection - never mutates raw records, only inserts
 * or replaces the single derived record for that day.
 */
export async function recomputeDerived(
  employeeId: Types.ObjectId | string,
  date: string,
  reason = 'late_punch_arrived'
): Promise<void> {
  const employee = (await EmployeeModel.findById(employeeId).lean()) as EmployeeDoc | null;
  if (!employee) return;

  const isWeeklyOff = employee.weeklyOff?.includes(weekdayOf(date)) ?? false;

  // Approved full-day leave always wins, even over stray raw punches - otherwise the
  // Leave module says "on leave" while Attendance (real or compliant) fabricates a
  // worked shift for the same day, which is an obvious contradiction to anyone
  // cross-referencing both. Half-day leave is left alone; that's a legitimate partial
  // work day, not an absence.
  const onApprovedLeave = await LeaveApplicationModel.exists({
    employeeId,
    status: 'Approved',
    halfDayPortion: null,
    fromDate: { $lte: date },
    toDate: { $gte: date },
  });

  // A shift can spill past midnight (Night always; Day rarely, on a late-entry +
  // long-shift combination) - a plain rawDate match would only ever see one side.
  const window = shiftDayWindow(date, employee.timeShift === 'Night' ? 'Night' : 'Day');

  const raws = onApprovedLeave
    ? []
    : await AttendanceRawModel.find({
        employeeId,
        rawTimestamp: { $gte: window.start, $lt: window.end },
      })
        .sort({ rawTimestamp: 1 })
        .lean();

  if (raws.length === 0) {
    // No punches (or on approved leave) and not a weekly off -> Absent.
    await upsertDerived(employeeId, date, {
      realEntryAt: null,
      realExitAt: null,
      realGrossHours: 0,
      realNetHours: 0,
      breakMinutes: 0,
      compliantEntryAt: null,
      compliantExitAt: null,
      compliantHours: 0,
      otHours: 0,
      dayType: isWeeklyOff ? 'Weekly Off' : 'Working',
      status: isWeeklyOff ? 'Weekly Off' : 'Absent',
      rawRecordIds: [],
      computedFromSmartAnchorVersion: 'v3.0.0',
    }, reason);
    return;
  }

  const realEntryAt = raws[0]!.rawTimestamp as Date;
  const realExitAt = raws[raws.length - 1]!.rawTimestamp as Date;
  const decomp = decomposeHours(realEntryAt, realExitAt);
  const settings = await SettingsModel.findOne().select('smartAnchorEnabled').lean();
  const smartAnchorOn = settings?.smartAnchorEnabled !== false;

  const sa = smartAnchorOn
    ? smartAnchorV3({
        employeeId: String(employeeId),
        date,
        alternateShift: employee.alternateShift as ComplianceShift,
        realEntryAt,
        realExitAt,
      })
    : { compliantEntryAt: null, compliantExitAt: null, compliantHours: 0, smartAnchorVersion: 'disabled' };

  await upsertDerived(employeeId, date, {
    realEntryAt,
    realExitAt,
    realGrossHours: decomp.realGrossHours,
    realNetHours: decomp.realNetHours,
    breakMinutes: decomp.breakMinutes,
    compliantEntryAt: sa.compliantEntryAt,
    compliantExitAt: sa.compliantExitAt,
    compliantHours: sa.compliantHours,
    otHours: decomp.otHours,
    dayType: isWeeklyOff ? 'Weekly Off' : 'Working',
    status: isWeeklyOff ? 'Weekly Off' : (decomp.realNetHours >= 4 ? 'Present' : 'Half Day'),
    rawRecordIds: raws.map(r => r._id),
    computedFromSmartAnchorVersion: sa.smartAnchorVersion,
  }, reason);
}

async function upsertDerived(
  employeeId: Types.ObjectId | string,
  date: string,
  fields: Record<string, unknown>,
  reason: string
) {
  const existing = await AttendanceDerivedModel.findOne({ employeeId, date });
  if (existing) {
    const previousState = existing.toObject();
    delete (previousState as any).recomputeHistory;
    existing.set({ ...fields, computedAt: new Date() });
    existing.recomputeHistory.push({
      recomputedAt: new Date(),
      previousState,
      reason,
    });
    await existing.save();
  } else {
    await AttendanceDerivedModel.create({
      employeeId,
      date,
      ...fields,
      computedAt: new Date(),
      recomputeHistory: [],
    });
  }
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function weekdayOf(dateStr: string): string {
  // 'YYYY-MM-DD' parsed as local; we don't need timezone precision here because
  // the IST date string already encodes the IST calendar day.
  const [y, m, d] = dateStr.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  return WEEKDAYS[dt.getUTCDay()]!;
}
