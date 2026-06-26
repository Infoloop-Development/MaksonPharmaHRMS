import { Types } from 'mongoose';
import { AttendanceDerivedModel } from '../models/AttendanceDerived.js';
import { ComplianceGeneratedAttendanceModel } from '../models/ComplianceGeneratedAttendance.js';

function monthDateRange(yearMonth: string) {
  return { $gte: `${yearMonth}-01`, $lte: `${yearMonth}-31` };
}

export async function sumComplianceHoursForMonth(
  employeeId: string,
  yearMonth: string
): Promise<number> {
  if (!Types.ObjectId.isValid(employeeId)) return 0;
  const [agg] = await ComplianceGeneratedAttendanceModel.aggregate<{ total: number }>([
    {
      $match: {
        employeeId: new Types.ObjectId(employeeId),
        date: monthDateRange(yearMonth),
      },
    },
    { $group: { _id: null, total: { $sum: '$hoursWorked' } } },
  ]);
  return agg?.total ?? 0;
}

/** Sum compliance hours per employee for a month (one aggregate query). */
export async function sumComplianceHoursByEmployeeForMonth(
  yearMonth: string
): Promise<Map<string, number>> {
  const rows = await ComplianceGeneratedAttendanceModel.aggregate<{
    _id: Types.ObjectId;
    total: number;
  }>([
    { $match: { date: monthDateRange(yearMonth) } },
    { $group: { _id: '$employeeId', total: { $sum: '$hoursWorked' } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.total]));
}

/** Sum real net hours per employee from attendance logs for a month. */
export async function sumRealNetHoursByEmployeeForMonth(
  yearMonth: string
): Promise<Map<string, number>> {
  const rows = await AttendanceDerivedModel.aggregate<{
    _id: Types.ObjectId;
    total: number;
  }>([
    { $match: { date: monthDateRange(yearMonth) } },
    { $group: { _id: '$employeeId', total: { $sum: '$realNetHours' } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), Math.round(r.total * 100) / 100]));
}
