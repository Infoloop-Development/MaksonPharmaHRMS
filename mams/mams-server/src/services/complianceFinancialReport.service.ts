import * as XLSX from 'xlsx';
import { Types } from 'mongoose';
import { BASELINE_HOURS } from '@mams/types';
import { ComplianceGeneratedAttendanceModel } from '../models/ComplianceGeneratedAttendance.js';
import { XLSX_CONTENT_TYPE } from './complianceMonthlyReport.service.js';

export { XLSX_CONTENT_TYPE };

export interface FinancialReportEmployeeInput {
  employeeId: string;
  name: string;
  realHours: number;
}

export interface FinancialReportInput {
  yearMonth: string;
  employees: FinancialReportEmployeeInput[];
}

export interface FinancialReportRow {
  name: string;
  complianceHours: number;
  realHours: number;
  complianceChequePayment: number;
  paymentInCash: number;
}

export function computeFinancialReportRow(
  name: string,
  complianceHoursRaw: number,
  realHours: number
): FinancialReportRow {
  const complianceHours = Math.min(complianceHoursRaw, BASELINE_HOURS);
  const complianceChequePayment = Math.min(realHours, BASELINE_HOURS);
  const paymentInCash = Math.max(0, realHours - BASELINE_HOURS);
  return { name, complianceHours, realHours, complianceChequePayment, paymentInCash };
}

export async function sumComplianceHoursForMonth(
  employeeId: string,
  yearMonth: string
): Promise<number> {
  if (!Types.ObjectId.isValid(employeeId)) return 0;
  const prefix = `${yearMonth}-`;
  const [agg] = await ComplianceGeneratedAttendanceModel.aggregate<{ total: number }>([
    {
      $match: {
        employeeId: new Types.ObjectId(employeeId),
        date: { $gte: `${yearMonth}-01`, $lte: `${yearMonth}-31` },
      },
    },
    { $group: { _id: null, total: { $sum: '$hoursWorked' } } },
  ]);
  return agg?.total ?? 0;
}

export async function buildFinancialReportRows(
  input: FinancialReportInput
): Promise<FinancialReportRow[]> {
  const rows: FinancialReportRow[] = [];
  for (const emp of input.employees) {
    const rawSum = await sumComplianceHoursForMonth(emp.employeeId, input.yearMonth);
    rows.push(computeFinancialReportRow(emp.name, rawSum, emp.realHours));
  }
  return rows;
}

export function buildFinancialReportXlsx(rows: FinancialReportRow[]): Buffer {
  const headers = [
    'Name',
    'Compliance Hours',
    'Real Hours',
    'Compliance cheque payment',
    'Payment in cash',
  ];
  const data = rows.map((r) => [
    r.name,
    r.complianceHours,
    r.realHours,
    r.complianceChequePayment,
    r.paymentInCash,
  ]);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  XLSX.utils.book_append_sheet(wb, ws, 'Financial Report');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export function financialReportFilename(yearMonth: string): string {
  return `financial-report-${yearMonth}.xlsx`;
}
