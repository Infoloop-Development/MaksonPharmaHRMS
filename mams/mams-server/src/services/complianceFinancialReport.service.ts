import * as XLSX from 'xlsx';
import { Types } from 'mongoose';
import { BASELINE_HOURS } from '@mams/types';
import { AttendanceDerivedModel } from '../models/AttendanceDerived.js';
import { ComplianceGeneratedAttendanceModel } from '../models/ComplianceGeneratedAttendance.js';
import { EmployeeModel } from '../models/Employee.js';
import { XLSX_CONTENT_TYPE } from './complianceMonthlyReport.service.js';

export { XLSX_CONTENT_TYPE };

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

/** Sum compliance hours per employee for a month (one aggregate query). */
export async function sumComplianceHoursByEmployeeForMonth(
  yearMonth: string
): Promise<Map<string, number>> {
  const rows = await ComplianceGeneratedAttendanceModel.aggregate<{
    _id: Types.ObjectId;
    total: number;
  }>([
    {
      $match: {
        date: { $gte: `${yearMonth}-01`, $lte: `${yearMonth}-31` },
      },
    },
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
    {
      $match: {
        date: { $gte: `${yearMonth}-01`, $lte: `${yearMonth}-31` },
      },
    },
    { $group: { _id: '$employeeId', total: { $sum: '$realNetHours' } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), Math.round(r.total * 100) / 100]));
}

/** All active employees: compliance from generated records, real from attendance logs. */
export async function buildFinancialReportRows(yearMonth: string): Promise<FinancialReportRow[]> {
  const [complianceByEmployee, realByEmployee, employees] = await Promise.all([
    sumComplianceHoursByEmployeeForMonth(yearMonth),
    sumRealNetHoursByEmployeeForMonth(yearMonth),
    EmployeeModel.find({ status: 'Active', isDeleted: { $ne: true } })
      .select('name empCode')
      .sort({ empCode: 1 })
      .lean(),
  ]);

  return employees.map((emp) => {
    const employeeId = String(emp._id);
    const complianceRaw = complianceByEmployee.get(employeeId) ?? 0;
    const realHours = realByEmployee.get(employeeId) ?? 0;
    return computeFinancialReportRow(emp.name, complianceRaw, realHours);
  });
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
