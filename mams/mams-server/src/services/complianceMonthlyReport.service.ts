import * as XLSX from 'xlsx';
import {
  BASELINE_HOURS,
  COMPLIANCE_SHIFT_BUFFER_PRESETS,
  computeMonthlyPlan,
  dayStatusExportLabel,
  formatCheckOutLabel,
  type ComplianceShift,
} from '@mams/types';
import { buildPlainXlsxBuffer, XLSX_CONTENT_TYPE } from './plainXlsx.service.js';

export { XLSX_CONTENT_TYPE };

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

function shiftLabel(shift: ComplianceShift): string {
  if (shift === 'A') return 'Morning';
  if (shift === 'B') return 'Afternoon';
  return 'Night';
}

export function buildComplianceMonthlyReportXlsx(input: ComplianceMonthlyReportInput): Buffer {
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
  const dailyRows: (string | number)[][] = [];

  for (const emp of input.employees) {
    const preset = COMPLIANCE_SHIFT_BUFFER_PRESETS[emp.alternateShift];
    const plan = computeMonthlyPlan({
      yearMonth: input.yearMonth,
      shift: emp.alternateShift,
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
      shiftLabel(emp.alternateShift),
      input.yearMonth,
      reportedHours,
      plan.summary.calendarPresentDays,
      plan.summary.calendarLeaveDays,
      weeklyOffDays,
    ]);

    for (const day of plan.days) {
      if (!day.inMonth || day.status === 'empty') continue;
      dailyRows.push([
        emp.empCode,
        emp.name,
        emp.department,
        input.yearMonth,
        day.date,
        day.weekday,
        dayStatusExportLabel(day.status),
        shiftLabel(emp.alternateShift),
        day.checkIn ?? '',
        day.checkOut ? formatCheckOutLabel(day.checkOut, day.checkOutNextDay) : '',
        day.hoursWorked ?? '',
      ]);
    }
  }

  const wb = XLSX.utils.book_new();
  const summaryWs = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryRows]);
  const dailyWs = XLSX.utils.aoa_to_sheet([dailyHeaders, ...dailyRows]);
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
