import type { Types } from 'mongoose';
import { AttendanceRawModel } from '../models/AttendanceRaw.js';
import { AttendanceDerivedModel } from '../models/AttendanceDerived.js';
import { EmployeeModel, type EmployeeDoc } from '../models/Employee.js';
import { decomposeHours, smartAnchorV2 } from './smartAnchor.js';
import type { ComplianceShift } from '@mams/types';

/**
 * Recompute attendance_derived for a given (employeeId, date) pair.
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

  const raws = await AttendanceRawModel.find({
    employeeId,
    rawDate: date,
  })
    .sort({ rawTimestamp: 1 })
    .lean();

  const isWeeklyOff = employee.weeklyOff?.includes(weekdayOf(date)) ?? false;

  if (raws.length === 0) {
    // No punches and not a weekly off -> Absent.
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
      computedFromSmartAnchorVersion: 'v2.0.0',
    }, reason);
    return;
  }

  const realEntryAt = raws[0]!.rawTimestamp as Date;
  const realExitAt = raws[raws.length - 1]!.rawTimestamp as Date;
  const decomp = decomposeHours(realEntryAt, realExitAt);

  const sa = smartAnchorV2({
    employeeId: String(employeeId),
    date,
    alternateShift: employee.alternateShift as ComplianceShift,
    realEntryAt,
    realExitAt,
  });

  await upsertDerived(employeeId, date, {
    realEntryAt,
    realExitAt,
    realGrossHours: decomp.realGrossHours,
    realNetHours: decomp.realNetHours,
    breakMinutes: decomp.breakMinutes,
    compliantEntryAt: sa.compliantEntryAt,
    compliantExitAt: sa.compliantExitAt,
    compliantHours: decomp.compliantHours,
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
