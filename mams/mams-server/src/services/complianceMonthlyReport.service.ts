import * as XLSX from 'xlsx';
import {
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
    'Extra Hours',
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
    summaryRows.push([
      emp.empCode,
      emp.name,
      emp.department,
      shiftLabel(emp.alternateShift),
      input.yearMonth,
      emp.totalHours,
      plan.summary.calendarPresentDays,
      plan.summary.calendarLeaveDays,
      weeklyOffDays,
      plan.summary.extraCashHours > 0 ? plan.summary.extraCashHours : '',
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
