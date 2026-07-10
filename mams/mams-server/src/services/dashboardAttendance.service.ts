import type {
  DashboardAttendanceQuery,
  DashboardAttendanceRow,
  DashboardAttendanceDisplayStatus,
  ViewMode,
} from '@mams/types';

export type DashboardAttendanceFilterQuery = Omit<DashboardAttendanceQuery, 'page' | 'pageSize'>;
import { AttendanceDerivedModel } from '../models/AttendanceDerived.js';
import { EmployeeModel } from '../models/Employee.js';
import { isLateEntry, isCompliantLateEntry } from './dashboard.service.js';
import { utcToIstTimeHmsMsString } from '../utils/time.js';

const EXPORT_CAP = 10_000;

type PopulatedEmployee = {
  _id: { toString(): string };
  name: string;
  empCode: string;
  department: string;
  timeShift: 'Day' | 'Night';
  alternateShift?: string;
  status: string;
};

type DerivedLean = {
  employeeId: PopulatedEmployee | null;
  date: string;
  status: string;
  realEntryAt?: Date | null;
  realExitAt?: Date | null;
  realNetHours?: number | null;
  compliantEntryAt?: Date | null;
  compliantExitAt?: Date | null;
  compliantHours?: number | null;
};

function projectionFor(viewMode: ViewMode) {
  return viewMode === 'compliant'
    ? 'employeeId date compliantEntryAt compliantExitAt compliantHours status'
    : 'employeeId date realEntryAt realExitAt realNetHours status';
}

function formatStamp(d: Date | null | undefined): string {
  if (!d) return '-';
  return utcToIstTimeHmsMsString(d);
}

function computeDisplayStatus(
  dbStatus: string,
  entryAt: Date | null | undefined,
  timeShift: 'Day' | 'Night',
  viewMode: ViewMode = 'real',
  alternateShift?: string
): DashboardAttendanceDisplayStatus {
  if (dbStatus === 'Weekly Off') return 'Weekly Off';
  if (dbStatus === 'Half Day') return 'Half Day';
  if (dbStatus === 'Absent') return 'Absent';
  if (dbStatus === 'Present') {
    if (entryAt) {
      const isLate = viewMode === 'compliant' && alternateShift
        ? isCompliantLateEntry(entryAt, alternateShift as 'A' | 'B' | 'C')
        : isLateEntry(entryAt, timeShift);
      if (isLate) return 'Late';
    }
    return 'Present';
  }
  return 'Absent';
}

function rowFromDerived(doc: DerivedLean, viewMode: ViewMode): DashboardAttendanceRow | null {
  const emp = doc.employeeId;
  if (!emp || emp.status !== 'Active') return null;

  const entryAt = viewMode === 'compliant' ? doc.compliantEntryAt : doc.realEntryAt;
  const exitAt = viewMode === 'compliant' ? doc.compliantExitAt : doc.realExitAt;
  const hours = viewMode === 'compliant' ? (doc.compliantHours ?? null) : (doc.realNetHours ?? null);

  const displayStatus = computeDisplayStatus(doc.status, entryAt ?? null, emp.timeShift, viewMode, emp.alternateShift);

  return {
    employeeId: emp._id.toString(),
    employeeName: emp.name,
    empCode: emp.empCode,
    department: emp.department,
    timeShift: viewMode === 'compliant' ? (emp.alternateShift ?? emp.timeShift) : emp.timeShift,
    entryStamp: doc.status === 'Present' || doc.status === 'Half Day' ? formatStamp(entryAt) : '-',
    exitStamp: doc.status === 'Present' || doc.status === 'Half Day' ? formatStamp(exitAt) : '-',
    totalHoursWorked: doc.status === 'Present' || doc.status === 'Half Day' ? hours : null,
    displayStatus,
  };
}

function matchesSearch(row: DashboardAttendanceRow, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (
    row.employeeName.toLowerCase().includes(q) ||
    row.empCode.toLowerCase().includes(q)
  );
}

function matchesStatusFilter(
  row: DashboardAttendanceRow,
  status: DashboardAttendanceQuery['status']
): boolean {
  if (!status || status === 'All') return true;
  if (status === 'Present') return row.displayStatus === 'Present';
  if (status === 'On Time') return row.displayStatus === 'Present';
  if (status === 'Late') return row.displayStatus === 'Late';
  if (status === 'Absent') return row.displayStatus === 'Absent';
  if (status === 'Weekly Off') return row.displayStatus === 'Weekly Off';
  if (status === 'Half Day') return row.displayStatus === 'Half Day';
  return true;
}

function applyFilters(
  rows: DashboardAttendanceRow[],
  q: DashboardAttendanceFilterQuery
): DashboardAttendanceRow[] {
  return rows.filter((row) => {
    if (q.department && row.department !== q.department) return false;
    if (q.timeShift && row.timeShift !== q.timeShift) return false;
    if (!matchesSearch(row, q.search ?? '')) return false;
    if (!matchesStatusFilter(row, q.status)) return false;
    return true;
  });
}

async function fetchRowsForDate(date: string, viewMode: ViewMode): Promise<DashboardAttendanceRow[]> {
  const docs = await AttendanceDerivedModel.find({ date }, projectionFor(viewMode))
    .populate('employeeId', 'name empCode department timeShift alternateShift status')
    .lean();

  const rows: DashboardAttendanceRow[] = [];
  for (const doc of docs as unknown as DerivedLean[]) {
    const row = rowFromDerived(doc, viewMode);
    if (row) rows.push(row);
  }

  rows.sort((a, b) => a.empCode.localeCompare(b.empCode));
  return rows;
}

export async function listDashboardDepartments(): Promise<string[]> {
  const departments = await EmployeeModel.distinct('department', {
    status: 'Active',
    isDeleted: { $ne: true },
  });
  return (departments as string[]).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

export async function listDashboardAttendance(
  q: DashboardAttendanceQuery,
  viewMode: ViewMode
) {
  const allRows = await fetchRowsForDate(q.date, viewMode);
  const filtered = applyFilters(allRows, q);
  const total = filtered.length;
  const start = (q.page - 1) * q.pageSize;
  const items = filtered.slice(start, start + q.pageSize);

  return {
    viewMode,
    date: q.date,
    items,
    total,
    page: q.page,
    pageSize: q.pageSize,
  };
}

export async function listDashboardAttendanceForExport(
  q: DashboardAttendanceFilterQuery,
  viewMode: ViewMode
): Promise<DashboardAttendanceRow[]> {
  const allRows = await fetchRowsForDate(q.date, viewMode);
  const filtered = applyFilters(allRows, q);
  return filtered.slice(0, EXPORT_CAP);
}

export function shiftLabel(timeShift: string): string {
  if (timeShift === 'Day') return 'Day Shift';
  if (timeShift === 'Night') return 'Night Shift';
  if (timeShift === 'A') return 'Shift A';
  if (timeShift === 'B') return 'Shift B';
  if (timeShift === 'C') return 'Shift C';
  return timeShift;
}
