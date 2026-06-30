import type {
  AdminOverviewTableConfig,
  DashboardAttendanceRow,
  DashboardAttendanceStatusFilter,
  Role,
} from '@mams/types';
import { ROLE_LABELS } from '@mams/types';
import { adminOverviewApi } from '../api/admin';
import { dashboardApi } from '../api/dashboard';
import type { CompanyBranding } from './companyBranding';
import {
  ADMIN_ATTENDANCE_COLUMN_LABELS,
  type AdminAttendanceVisibleColumn,
  kindLabel,
  resolveAttendanceVisibleColumns,
  resolveGenericTableColumns,
  type GenericTableFilterDefaults,
} from './adminOverviewTableUtils';
import { EMPTY_CELL, fmtHours, fmtIstTime } from './format';
import { openReportPrintWindow, type ReportPrintColumn } from './reportPrintDocument';

const PAGE_SIZE = 100;
const MAX_ROWS = 5000;

const MONO_COLS = new Set(['empCode', 'deviceCode', 'biometricId', 'occurredAt', 'lastLogin', 'lastPing']);

export type GenericTableExportFilters = GenericTableFilterDefaults & {
  search?: string;
};

export type AttendanceExportFilters = {
  date: string;
  search?: string;
  department?: string;
  timeShift?: 'Day' | 'Night';
  status?: DashboardAttendanceStatusFilter;
};

function genericCellExportValue(col: string, row: Record<string, unknown>): string {
  if (col === 'occurredAt' && row.occurredAt) return new Date(String(row.occurredAt)).toLocaleString();
  if (col === 'lastLogin' && row.lastLogin) return new Date(String(row.lastLogin)).toLocaleString();
  if (col === 'lastPing' && row.lastPing) return new Date(String(row.lastPing)).toLocaleString();
  if (col === 'role' && row.role) return ROLE_LABELS[row.role as Role] ?? String(row.role);
  if (col === 'active' || col === 'online') return row[col] ? 'Yes' : 'No';
  const val = row[col];
  if (val == null || val === '') return EMPTY_CELL;
  return String(val);
}

export function buildGenericPrintColumns(config: AdminOverviewTableConfig): ReportPrintColumn[] {
  return resolveGenericTableColumns(config).map((c) => ({
    key: c.id,
    label: c.label,
    mono: MONO_COLS.has(c.id),
  }));
}

export function buildGenericPrintRows(
  items: Record<string, unknown>[],
  columnIds: string[]
): Record<string, string | number>[] {
  return items.map((row) => {
    const out: Record<string, string | number> = {};
    for (const col of columnIds) {
      out[col] = genericCellExportValue(col, row);
    }
    return out;
  });
}

export function buildGenericFilterSubtitle(
  config: AdminOverviewTableConfig,
  filters: GenericTableExportFilters
): string | undefined {
  const parts: string[] = [];
  if (filters.search?.trim()) parts.push(`Search: ${filters.search.trim()}`);
  if (config.kind === 'users' || config.kind === 'audit') {
    if (filters.role) parts.push(`Role: ${ROLE_LABELS[filters.role as Role] ?? filters.role}`);
  }
  if (config.kind === 'users' && filters.active !== 'All') {
    parts.push(`Status: ${filters.active === 'yes' ? 'Active' : 'Inactive'}`);
  }
  if (config.kind === 'audit' && filters.eventType) parts.push(`Event: ${filters.eventType}`);
  if (config.kind === 'devices') {
    if (filters.location) parts.push(`Location: ${filters.location}`);
    if (filters.online !== 'All') parts.push(filters.online === 'yes' ? 'Online' : 'Offline');
  }
  if (config.kind === 'employees') {
    if (filters.status) parts.push(`Status: ${filters.status}`);
    if (filters.department) parts.push(`Department: ${filters.department}`);
  }
  return parts.length ? parts.join(' · ') : undefined;
}

async function fetchPaginated<T>(
  fetchPage: (page: number) => Promise<{ items: T[]; total: number }>
): Promise<{ items: T[]; truncated: boolean }> {
  const items: T[] = [];
  let page = 1;
  let truncated = false;

  while (items.length < MAX_ROWS) {
    const res = await fetchPage(page);
    items.push(...res.items);
    if (items.length >= res.total || res.items.length < PAGE_SIZE) break;
    if (items.length >= MAX_ROWS) {
      truncated = true;
      break;
    }
    page += 1;
  }

  return { items: items.slice(0, MAX_ROWS), truncated };
}

export async function fetchAllGenericTableRows(
  config: AdminOverviewTableConfig,
  filters: GenericTableExportFilters
): Promise<{ items: Record<string, unknown>[]; truncated: boolean }> {
  const search = filters.search?.trim() || undefined;
  const activeFilter = filters.active === 'All' ? undefined : filters.active === 'yes';
  const onlineFilter = filters.online === 'All' ? undefined : filters.online === 'yes';

  return fetchPaginated(async (page) => {
    if (config.kind === 'users') {
      return adminOverviewApi.users({
        page,
        pageSize: PAGE_SIZE,
        search,
        role: filters.role || undefined,
        active: activeFilter,
      });
    }
    if (config.kind === 'audit') {
      return adminOverviewApi.audit({
        page,
        pageSize: PAGE_SIZE,
        search,
        role: filters.role || undefined,
        eventType: filters.eventType || undefined,
      });
    }
    if (config.kind === 'devices') {
      return adminOverviewApi.devices({
        page,
        pageSize: PAGE_SIZE,
        search,
        location: filters.location || undefined,
        online: onlineFilter,
      });
    }
    return adminOverviewApi.employees({
      page,
      pageSize: PAGE_SIZE,
      search,
      status: filters.status || undefined,
      department: filters.department || undefined,
    });
  });
}

export function openGenericTablePrintWindow(options: {
  branding: CompanyBranding;
  config: AdminOverviewTableConfig;
  items: Record<string, unknown>[];
  filters: GenericTableExportFilters;
}): boolean {
  const columns = buildGenericPrintColumns(options.config);
  const columnIds = columns.map((c) => c.key);
  const rows = buildGenericPrintRows(options.items, columnIds);
  const subtitle = buildGenericFilterSubtitle(options.config, options.filters);

  return openReportPrintWindow({
    branding: options.branding,
    title: kindLabel(options.config.kind),
    subtitle,
    summaryLine: `${options.items.length} record(s)`,
    columns,
    rows,
    signatoryOnLastPage: true,
  });
}

type AttendancePrintColumnId = AdminAttendanceVisibleColumn | 'entry' | 'exit';

const FULL_DASHBOARD_ATTENDANCE_COLUMNS: AttendancePrintColumnId[] = [
  'name',
  'empCode',
  'department',
  'shift',
  'entry',
  'exit',
  'hours',
  'status',
];

const ATTENDANCE_PRINT_LABELS: Record<AttendancePrintColumnId, string> = {
  ...ADMIN_ATTENDANCE_COLUMN_LABELS,
  entry: 'Entry',
  exit: 'Exit',
};

export function buildAttendancePrintColumns(visibleColumns?: string[]): ReportPrintColumn[] {
  const adminCols = resolveAttendanceVisibleColumns(visibleColumns);
  const colIds: AttendancePrintColumnId[] =
    adminCols !== null ? adminCols : FULL_DASHBOARD_ATTENDANCE_COLUMNS;

  return colIds.map((id) => ({
    key: id,
    label: ATTENDANCE_PRINT_LABELS[id],
    mono: id === 'empCode' || id === 'entry' || id === 'exit',
  }));
}

export function buildAttendancePrintRows(
  items: DashboardAttendanceRow[],
  columnIds: string[]
): Record<string, string | number>[] {
  return items.map((row) => {
    const out: Record<string, string | number> = {};
    for (const col of columnIds) {
      switch (col) {
        case 'name':
          out[col] = row.employeeName;
          break;
        case 'empCode':
          out[col] = row.empCode;
          break;
        case 'department':
          out[col] = row.department;
          break;
        case 'shift':
          out[col] = row.timeShift;
          break;
        case 'entry':
          out[col] = row.entryStamp ? fmtIstTime(row.entryStamp) : EMPTY_CELL;
          break;
        case 'exit':
          out[col] = row.exitStamp ? fmtIstTime(row.exitStamp) : EMPTY_CELL;
          break;
        case 'hours':
          out[col] = row.totalHoursWorked != null ? fmtHours(row.totalHoursWorked) : EMPTY_CELL;
          break;
        case 'status':
          out[col] = row.displayStatus;
          break;
        default:
          out[col] = EMPTY_CELL;
      }
    }
    return out;
  });
}

export function buildAttendanceFilterSubtitle(filters: AttendanceExportFilters): string | undefined {
  const parts: string[] = [];
  if (filters.search?.trim()) parts.push(`Search: ${filters.search.trim()}`);
  if (filters.department) parts.push(`Department: ${filters.department}`);
  if (filters.timeShift) parts.push(`Shift: ${filters.timeShift}`);
  if (filters.status && filters.status !== 'All') parts.push(`Status: ${filters.status}`);
  return parts.length ? parts.join(' · ') : undefined;
}

export async function fetchAllAttendanceRows(
  filters: AttendanceExportFilters
): Promise<{ items: DashboardAttendanceRow[]; truncated: boolean }> {
  return fetchPaginated(async (page) =>
    dashboardApi.attendance({
      date: filters.date,
      search: filters.search,
      department: filters.department,
      timeShift: filters.timeShift,
      status: filters.status ?? 'All',
      page,
      pageSize: PAGE_SIZE,
    })
  );
}

export function openAttendanceTablePrintWindow(options: {
  branding: CompanyBranding;
  date: string;
  items: DashboardAttendanceRow[];
  filters: AttendanceExportFilters;
  visibleColumns?: string[];
  titleSuffix?: string;
}): boolean {
  const columns = buildAttendancePrintColumns(options.visibleColumns);
  const columnIds = columns.map((c) => c.key);
  const rows = buildAttendancePrintRows(options.items, columnIds);
  const subtitle = buildAttendanceFilterSubtitle(options.filters);
  const title = options.titleSuffix
    ? `Attendance: ${options.titleSuffix}`
    : `Attendance: ${options.date}`;

  return openReportPrintWindow({
    branding: options.branding,
    title,
    subtitle,
    summaryLine: `${options.items.length} record(s)`,
    columns,
    rows,
    signatoryOnLastPage: true,
  });
}
