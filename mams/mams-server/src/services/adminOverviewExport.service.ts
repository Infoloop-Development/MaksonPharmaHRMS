import type { ExportTypeKey } from '@mams/types';
import { ADMIN_OVERVIEW_TABLE_COLUMNS } from '@mams/types';
import type { AdminOverviewTableKind } from '@mams/types';
import { SettingsModel } from '../models/Settings.js';
import { buildExportFileName } from './exportFileName.service.js';
import { buildPlainXlsxBuffer } from './plainXlsx.service.js';
import {
  auditPageBadge,
  listAdminOverviewDevices,
  listAdminOverviewEmployees,
  listAdminOverviewUsers,
} from './adminOverview.service.js';
import { listOrgActivity } from './activity.service.js';
import {
  listDashboardAttendanceForExport,
  shiftLabel,
} from './dashboardAttendance.service.js';

const EXPORT_PAGE_SIZE = 5000;

const EXPORT_TYPE_KEYS: Record<AdminOverviewTableKind, ExportTypeKey> = {
  attendance: 'adminOverviewAttendanceXlsx',
  users: 'adminOverviewUsersXlsx',
  audit: 'adminOverviewAuditXlsx',
  devices: 'adminOverviewDevicesXlsx',
  employees: 'adminOverviewEmployeesXlsx',
};

function parseColumns(kind: AdminOverviewTableKind, columnsParam?: string): string[] {
  const allowed = ADMIN_OVERVIEW_TABLE_COLUMNS[kind].map((c) => c.id);
  if (!columnsParam?.trim()) return allowed;
  const picked = columnsParam.split(',').map((c) => c.trim()).filter(Boolean);
  const filtered = picked.filter((c) => allowed.includes(c));
  return filtered.length > 0 ? filtered : allowed;
}

function columnLabels(kind: AdminOverviewTableKind, columnIds: string[]): string[] {
  const map = Object.fromEntries(ADMIN_OVERVIEW_TABLE_COLUMNS[kind].map((c) => [c.id, c.label]));
  return columnIds.map((id) => map[id] ?? id);
}

function cellExportValue(col: string, row: Record<string, unknown>): string | number {
  if (col === 'occurredAt' && row.occurredAt) return new Date(String(row.occurredAt)).toLocaleString();
  if (col === 'lastLogin' && row.lastLogin) return new Date(String(row.lastLogin)).toLocaleString();
  if (col === 'lastPing' && row.lastPing) return new Date(String(row.lastPing)).toLocaleString();
  if (col === 'active' || col === 'online') return row[col] ? 'Yes' : 'No';
  const val = row[col];
  if (val == null || val === '') return '';
  return typeof val === 'number' ? val : String(val);
}

function buildSheet(headers: string[], dataRows: (string | number)[][], sheetName = 'Data'): Buffer {
  return buildPlainXlsxBuffer(headers, dataRows, sheetName);
}

export async function exportAdminOverviewTableXlsx(
  kind: AdminOverviewTableKind,
  query: Record<string, string | undefined>,
  viewMode: 'real' | 'compliant'
): Promise<{ buffer: Buffer; filename: string }> {
  const settingsDoc = await SettingsModel.findOne().lean();
  const columns = parseColumns(kind, query.columns);
  const headers = columnLabels(kind, columns);
  const exportKey = EXPORT_TYPE_KEYS[kind];

  let dataRows: (string | number)[][] = [];
  let fileContext: {
    department?: string;
    location?: string;
    asOfDate?: string;
    companyName?: string;
  } = { companyName: settingsDoc?.companyName };

  if (kind === 'attendance') {
    const date = query.date ?? '';
    fileContext = { ...fileContext, department: query.department, asOfDate: date };
    const rows = await listDashboardAttendanceForExport(
      {
        date,
        search: query.search,
        department: query.department,
        timeShift: query.timeShift as 'Day' | 'Night' | undefined,
        status: query.status as never,
      },
      viewMode
    );
    const attendanceMap: Record<string, (r: (typeof rows)[0]) => string | number> = {
      name: (r) => r.employeeName,
      empCode: (r) => r.empCode,
      department: (r) => r.department,
      shift: (r) => shiftLabel(r.timeShift),
      hours: (r) => r.totalHoursWorked ?? '',
      status: (r) => r.displayStatus,
    };
    dataRows = rows.map((r) => columns.map((c) => attendanceMap[c]?.(r) ?? ''));
  } else if (kind === 'users') {
    const result = await listAdminOverviewUsers({
      page: 1,
      pageSize: EXPORT_PAGE_SIZE,
      search: query.search,
      role: query.role,
      active: query.active === 'true' ? true : query.active === 'false' ? false : undefined,
    });
    dataRows = result.items.map((row) => columns.map((c) => cellExportValue(c, row)));
    fileContext.asOfDate = new Date().toISOString().slice(0, 10);
  } else if (kind === 'devices') {
    const result = await listAdminOverviewDevices({
      page: 1,
      pageSize: EXPORT_PAGE_SIZE,
      search: query.search,
      location: query.location,
      online: query.online === 'true' ? true : query.online === 'false' ? false : undefined,
    });
    dataRows = result.items.map((row) => columns.map((c) => cellExportValue(c, row)));
    fileContext = { ...fileContext, location: query.location, asOfDate: new Date().toISOString().slice(0, 10) };
  } else if (kind === 'employees') {
    const result = await listAdminOverviewEmployees({
      page: 1,
      pageSize: EXPORT_PAGE_SIZE,
      search: query.search,
      status: query.status,
      department: query.department,
    });
    dataRows = result.items.map((row) => columns.map((c) => cellExportValue(c, row)));
    fileContext = { ...fileContext, department: query.department, asOfDate: new Date().toISOString().slice(0, 10) };
  } else if (kind === 'audit') {
    const result = await listOrgActivity({
      page: 1,
      pageSize: EXPORT_PAGE_SIZE,
      search: query.search,
      role: query.role,
      eventType: query.eventType,
      category: query.category as never,
      userId: query.userId,
    });
    const items = result.items.map((row) => ({
      ...row,
      pageBadge: auditPageBadge(row.eventType),
    }));
    dataRows = items.map((row) => columns.map((c) => cellExportValue(c, row as Record<string, unknown>)));
    fileContext.asOfDate = new Date().toISOString().slice(0, 10);
  }

  const buffer = buildSheet(headers, dataRows);
  const filename = buildExportFileName(exportKey, fileContext, settingsDoc?.exportNaming, settingsDoc?.companyName);
  return { buffer, filename };
}
