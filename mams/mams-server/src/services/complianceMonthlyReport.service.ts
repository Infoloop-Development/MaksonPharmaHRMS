import * as XLSX from 'xlsx';
import {
  BASELINE_HOURS,
  COMPLIANCE_SHIFT_BUFFER_PRESETS,
  computeMonthlyPlan,
  dayStatusExportLabel,
  formatCheckOutLabel,
  type ComplianceShift,
  type MonthlyPlanResult,
} from '@mams/types';
import { EmployeeModel } from '../models/Employee.js';
import { sumComplianceHoursByEmployeeForMonth } from './complianceHoursAggregate.service.js';
import { buildPlainXlsxBuffer, XLSX_CONTENT_TYPE } from './plainXlsx.service.js';
import { logger } from '../utils/logger.js';

export { XLSX_CONTENT_TYPE };

/** Yield to the event loop every N employees during large report builds. */
export const REPORT_BUILD_YIELD_EVERY = 50;

/** Abort build if processing exceeds this (ms) — avoids Render hard timeout with no message. */
export const REPORT_BUILD_MAX_MS = 90_000;

export interface ComplianceReportEmployeeInput {
  employeeId: string;
  empCode: string;
  name: string;
  department: string;
  alternateShift: ComplianceShift;
  totalHours: number;
}

export interface ComplianceMonthlyReportInput {
  yearMonth: string;
  employees: ComplianceReportEmployeeInput[];
}

export interface ComplianceReportOverride {
  employeeId: string;
  totalHours: number;
}

export function normalizeComplianceShift(shift: string): ComplianceShift {
  if (shift === 'A' || shift === 'B' || shift === 'C') return shift;
  return 'A';
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

/** All active employees for the month; overrides replace totalHours for selected ids only. */
export async function resolveComplianceReportEmployees(
  yearMonth: string,
  overrides: ComplianceReportOverride[]
): Promise<ComplianceReportEmployeeInput[]> {
  const overrideMap = new Map(overrides.map((o) => [o.employeeId, o.totalHours]));
  const hoursByEmployee = await sumComplianceHoursByEmployeeForMonth(yearMonth);

  const employees = await EmployeeModel.find({
    status: 'Active',
    isDeleted: { $ne: true },
  })
    .select('empCode name department alternateShift')
    .sort({ empCode: 1 })
    .lean();

  return employees.map((emp) => {
    const employeeId = String(emp._id);
    const dbHours = hoursByEmployee.get(employeeId) ?? 0;
    const totalHours = overrideMap.has(employeeId)
      ? overrideMap.get(employeeId)!
      : dbHours > 0
        ? dbHours
        : BASELINE_HOURS;

    return {
      employeeId,
      empCode: emp.empCode,
      name: emp.name,
      department: emp.department,
      alternateShift: normalizeComplianceShift(String(emp.alternateShift ?? 'A')),
      totalHours,
    };
  });
}

function shiftLabel(shift: ComplianceShift): string {
  if (shift === 'A') return 'Morning';
  if (shift === 'B') return 'Afternoon';
  return 'Night';
}

function dailyRowsForEmployee(
  emp: ComplianceReportEmployeeInput,
  yearMonth: string,
  shift: ComplianceShift,
  plan: MonthlyPlanResult
): (string | number)[][] {
  const rows: (string | number)[][] = [];
  const shiftName = shiftLabel(shift);
  for (const day of plan.days) {
    if (!day.inMonth || day.status === 'empty') continue;
    rows.push([
      emp.empCode,
      emp.name,
      emp.department,
      yearMonth,
      day.date,
      day.weekday,
      dayStatusExportLabel(day.status),
      shiftName,
      day.checkIn ?? '',
      day.checkOut ? formatCheckOutLabel(day.checkOut, day.checkOutNextDay) : '',
      day.hoursWorked ?? '',
    ]);
  }
  return rows;
}

export async function buildComplianceMonthlyReportXlsx(
  input: ComplianceMonthlyReportInput,
  options?: { startedAt?: number }
): Promise<Buffer> {
  const buildStartedAt = options?.startedAt ?? Date.now();

  const summaryHeaders = [
    'Code',
    'Name',
    'Department',
    'Shift',
    'Month',
    'Total Hours',
    'Present Days',
    'Leave Days',
    'Weekly Off Days',
  ];
  const summaryRows: (string | number)[][] = [];

  const dailyHeaders = [
    'Code',
    'Name',
    'Department',
    'Month',
    'Date',
    'Weekday',
    'Status',
    'Shift',
    'Clock-in',
    'Clock-out',
    'Hours',
  ];

  const dailyWs = XLSX.utils.aoa_to_sheet([dailyHeaders]);

  let processed = 0;
  for (const emp of input.employees) {
    if (Date.now() - buildStartedAt > REPORT_BUILD_MAX_MS) {
      throw new Error(
        `Report build exceeded ${REPORT_BUILD_MAX_MS / 1000}s for ${input.employees.length} employees`
      );
    }

    const shift = normalizeComplianceShift(emp.alternateShift);
    if (shift !== emp.alternateShift) {
      logger.warn('compliance_report_invalid_shift', {
        empCode: emp.empCode,
        alternateShift: emp.alternateShift,
      });
    }

    const preset = COMPLIANCE_SHIFT_BUFFER_PRESETS[shift];
    const plan = computeMonthlyPlan({
      yearMonth: input.yearMonth,
      shift,
      bufferStart: preset.bufferStart,
      bufferEnd: preset.bufferEnd,
      realHours: emp.totalHours,
      seedNamespace: `${emp.employeeId}:${input.yearMonth}`,
    });
    if ('error' in plan) {
      throw new Error(`${emp.empCode}: ${plan.error}`);
    }

    const weeklyOffDays = plan.days.filter((d) => d.status === 'weeklyOff').length;
    const reportedHours = Math.min(emp.totalHours, BASELINE_HOURS);
    summaryRows.push([
      emp.empCode,
      emp.name,
      emp.department,
      shiftLabel(shift),
      input.yearMonth,
      reportedHours,
      plan.summary.calendarPresentDays,
      plan.summary.calendarLeaveDays,
      weeklyOffDays,
    ]);

    const batch = dailyRowsForEmployee(emp, input.yearMonth, shift, plan);
    if (batch.length > 0) {
      XLSX.utils.sheet_add_aoa(dailyWs, batch, { origin: -1 });
    }

    processed += 1;
    if (processed % REPORT_BUILD_YIELD_EVERY === 0) {
      await yieldToEventLoop();
    }
  }

  const wb = XLSX.utils.book_new();
  const summaryWs = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryRows]);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
  XLSX.utils.book_append_sheet(wb, dailyWs, 'Daily');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export function complianceReportFilename(yearMonth: string): string {
  return `compliance-attendance-${yearMonth}.xlsx`;
}

/** Single-sheet fallback helper for tests. */
export function buildComplianceSummaryOnlyXlsx(
  headers: string[],
  rows: (string | number)[][]
): Buffer {
  return buildPlainXlsxBuffer(headers, rows, 'Summary');
}
