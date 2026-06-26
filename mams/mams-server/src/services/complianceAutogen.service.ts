import { fromZonedTime } from 'date-fns-tz';
import {
  COMPLIANCE_GENERATOR_VERSION,
  COMPLIANCE_SHIFT_ORDER,
  compareComplianceShift,
  generateDailyCompliancePunches,
  isSundayIstDate,
  type ComplianceShift,
} from '@mams/types';
import { EmployeeModel } from '../models/Employee.js';
import { ComplianceGeneratedAttendanceModel } from '../models/ComplianceGeneratedAttendance.js';
import { logger } from '../utils/logger.js';

const IST = 'Asia/Kolkata';

export interface ComplianceAutogenResult {
  date: string;
  skippedSunday: boolean;
  generated: number;
  errors: number;
}

function addIstDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

function istDateTimeToUtc(dateStr: string, timeHms: string): Date {
  const time = timeHms.length >= 8 ? timeHms.slice(0, 8) : `${timeHms}:00`;
  return fromZonedTime(`${dateStr}T${time}`, IST);
}

function punchesToUtc(
  date: string,
  punches: ReturnType<typeof generateDailyCompliancePunches>
): { checkInAt: Date; checkOutAt: Date } {
  const checkInAt = istDateTimeToUtc(date, punches.checkIn);
  const checkoutDate = punches.checkOutNextDay ? addIstDays(date, 1) : date;
  const checkOutAt = istDateTimeToUtc(checkoutDate, punches.checkOut);
  return { checkInAt, checkOutAt };
}

export async function runComplianceAutogenForDate(targetDate: string): Promise<ComplianceAutogenResult> {
  if (isSundayIstDate(targetDate)) {
    logger.info('compliance_autogen_skipped_sunday', { date: targetDate });
    return { date: targetDate, skippedSunday: true, generated: 0, errors: 0 };
  }

  const employees = await EmployeeModel.find({
    status: 'Active',
    isDeleted: { $ne: true },
  })
    .select('_id alternateShift name')
    .lean();

  employees.sort((a, b) => {
    const shiftCmp = compareComplianceShift(
      (a.alternateShift ?? 'A') as ComplianceShift,
      (b.alternateShift ?? 'A') as ComplianceShift
    );
    if (shiftCmp !== 0) return shiftCmp;
    return String(a.name ?? '').localeCompare(String(b.name ?? ''));
  });

  let generated = 0;
  let errors = 0;
  const now = new Date();
  const ops: Parameters<typeof ComplianceGeneratedAttendanceModel.bulkWrite>[0] = [];

  for (const emp of employees) {
    try {
      const alternateShift = (emp.alternateShift ?? 'A') as ComplianceShift;
      const seedBase = `${String(emp._id)}:${targetDate}`;
      const punches = generateDailyCompliancePunches({ seedBase, alternateShift });
      const { checkInAt, checkOutAt } = punchesToUtc(targetDate, punches);

      ops.push({
        updateOne: {
          filter: { employeeId: emp._id, date: targetDate },
          update: {
            $set: {
              alternateShift,
              checkInAt,
              checkOutAt,
              checkOutNextDay: punches.checkOutNextDay,
              hoursWorked: punches.hoursWorked,
              status: 'Present',
              generatedAt: now,
              generatorVersion: COMPLIANCE_GENERATOR_VERSION,
            },
          },
          upsert: true,
        },
      });
      generated++;
    } catch (err) {
      errors++;
      logger.warn('compliance_autogen_employee_failed', {
        date: targetDate,
        employeeId: String(emp._id),
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const BATCH = 500;
  for (let i = 0; i < ops.length; i += BATCH) {
    await ComplianceGeneratedAttendanceModel.bulkWrite(ops.slice(i, i + BATCH), { ordered: false });
  }

  logger.info('compliance_autogen_complete', { date: targetDate, generated, errors });
  return { date: targetDate, skippedSunday: false, generated, errors };
}

export interface ComplianceAutogenMonthResult {
  yearMonth: string;
  weekdaysProcessed: number;
  generated: number;
  errors: number;
}

/** Generate compliance attendance for every weekday in a calendar month (YYYY-MM). */
export async function runComplianceAutogenForMonth(yearMonth: string): Promise<ComplianceAutogenMonthResult> {
  const m = yearMonth.match(/^(\d{4})-(\d{2})$/);
  if (!m) throw new Error('yearMonth must be YYYY-MM');

  const year = parseInt(m[1]!, 10);
  const month = parseInt(m[2]!, 10);
  if (month < 1 || month > 12) throw new Error('Invalid month');

  const daysInMonth = new Date(year, month, 0).getDate();
  let weekdaysProcessed = 0;
  let generated = 0;
  let errors = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${yearMonth}-${String(d).padStart(2, '0')}`;
    const dow = new Date(year, month - 1, d).getDay();
    if (dow === 0) continue;
    weekdaysProcessed++;
    const result = await runComplianceAutogenForDate(date);
    generated += result.generated;
    errors += result.errors;
  }

  logger.info('compliance_autogen_month_complete', { yearMonth, weekdaysProcessed, generated, errors });
  return { yearMonth, weekdaysProcessed, generated, errors };
}

/** Yesterday IST calendar date (YYYY-MM-DD). */
export function yesterdayIstDateString(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  return addIstDays(today, -1);
}

export { COMPLIANCE_SHIFT_ORDER };
