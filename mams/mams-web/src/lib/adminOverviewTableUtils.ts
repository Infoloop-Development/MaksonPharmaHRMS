import { ADMIN_OVERVIEW_TABLE_COLUMNS } from '@mams/types';
import type { AdminOverviewTableConfig, AdminOverviewTableKind } from '@mams/types';

/** Admin-overview attendance columns (no entry/exit). */
export type AdminAttendanceVisibleColumn =
  | 'name'
  | 'empCode'
  | 'department'
  | 'shift'
  | 'hours'
  | 'status';

export const ADMIN_ATTENDANCE_COLUMNS: AdminAttendanceVisibleColumn[] = [
  'name',
  'empCode',
  'department',
  'shift',
  'hours',
  'status',
];

export const ADMIN_ATTENDANCE_COLUMN_LABELS: Record<AdminAttendanceVisibleColumn, string> = {
  name: 'Employee',
  empCode: 'ID',
  department: 'Department',
  shift: 'Shift',
  hours: 'Hours',
  status: 'Status',
};

export function resolveAttendanceVisibleColumns(
  visibleColumns?: string[]
): AdminAttendanceVisibleColumn[] | null {
  if (visibleColumns === undefined) return null;
  const allowed = new Set(ADMIN_ATTENDANCE_COLUMNS);
  const resolved = visibleColumns.filter((c): c is AdminAttendanceVisibleColumn =>
    allowed.has(c as AdminAttendanceVisibleColumn)
  );
  return resolved.length > 0 ? resolved : [...ADMIN_ATTENDANCE_COLUMNS];
}

export function resolveGenericTableColumns(config: AdminOverviewTableConfig) {
  return ADMIN_OVERVIEW_TABLE_COLUMNS[config.kind].filter((c) => config.columns.includes(c.id));
}

export function isSortColumnValid(sortCol: string | null, columnIds: string[]): boolean {
  return sortCol === null || columnIds.includes(sortCol);
}

export const TABLE_KIND_LABELS: Record<AdminOverviewTableKind, string> = {
  attendance: 'Attendance',
  users: 'Users',
  audit: 'Audit log',
  devices: 'Devices',
  employees: 'Employees',
};

export function kindLabel(kind: AdminOverviewTableKind): string {
  return TABLE_KIND_LABELS[kind];
}

export const TABLE_KIND_HINTS: Record<AdminOverviewTableKind, string> = {
  attendance: 'Click employee name to view full profile and attendance history',
  users: 'Org user accounts with role and login activity',
  audit: 'Platform audit events — filter by event type or role',
  devices: 'Biometric devices and connection status',
  employees: 'Employee directory with status and shift',
};

export type GenericTableFilterDefaults = {
  role: string;
  active: string;
  online: string;
  location: string;
  department: string;
  status: string;
  eventType: string;
};

export const GENERIC_TABLE_FILTER_DEFAULTS: GenericTableFilterDefaults = {
  role: '',
  active: 'All',
  online: 'All',
  location: '',
  department: '',
  status: '',
  eventType: '',
};

export function genericFilterDefaultsForKind(kind: AdminOverviewTableKind): GenericTableFilterDefaults {
  return { ...GENERIC_TABLE_FILTER_DEFAULTS };
}

/** CSS shell class used by HR-quality admin overview tables. */
export const ADMIN_TABLE_SCROLL_CLASS = 'dash-table-scroll';
