import { describe, it, expect } from 'vitest';
import { DEFAULT_ADMIN_OVERVIEW_TABLE_COLUMNS } from '@mams/types';
import {
  ADMIN_ATTENDANCE_COLUMN_LABELS,
  ADMIN_TABLE_SCROLL_CLASS,
  GENERIC_TABLE_FILTER_DEFAULTS,
  TABLE_KIND_LABELS,
  isSortColumnValid,
  resolveAttendanceVisibleColumns,
  resolveGenericTableColumns,
} from './adminOverviewTableUtils';

describe('adminOverviewTableUtils', () => {
  it('resolveAttendanceVisibleColumns returns null for dashboard full table mode', () => {
    expect(resolveAttendanceVisibleColumns(undefined)).toBeNull();
  });

  it('TABLE_KIND_LABELS has human labels for all kinds', () => {
    expect(TABLE_KIND_LABELS.attendance).toBe('Attendance');
    expect(TABLE_KIND_LABELS.audit).toBe('Audit log');
  });

  it('GENERIC_TABLE_FILTER_DEFAULTS starts with All/neutral values', () => {
    expect(GENERIC_TABLE_FILTER_DEFAULTS.active).toBe('All');
    expect(GENERIC_TABLE_FILTER_DEFAULTS.online).toBe('All');
  });

  it('resolveAttendanceVisibleColumns filters to name and status only', () => {
    expect(resolveAttendanceVisibleColumns(['name', 'status'])).toEqual(['name', 'status']);
    expect(ADMIN_ATTENDANCE_COLUMN_LABELS.name).toBe('Employee');
    expect(ADMIN_ATTENDANCE_COLUMN_LABELS.status).toBe('Status');
  });

  it('resolveAttendanceVisibleColumns falls back when empty after filter', () => {
    const cols = resolveAttendanceVisibleColumns(['invalid']);
    expect(cols).toEqual(['name', 'empCode', 'department', 'shift', 'hours', 'status']);
  });

  it('resolveGenericTableColumns respects config.columns for users', () => {
    const cols = resolveGenericTableColumns({
      kind: 'users',
      columns: ['name', 'email', 'role'],
    });
    expect(cols.map((c) => c.id)).toEqual(['name', 'email', 'role']);
  });

  it('isSortColumnValid rejects stale sort columns after kind change', () => {
    expect(isSortColumnValid('online', ['name', 'email'])).toBe(false);
    expect(isSortColumnValid('name', ['name', 'email'])).toBe(true);
    expect(isSortColumnValid(null, ['name'])).toBe(true);
  });

  it('uses dash-table-scroll shell class for HR-quality tables', () => {
    expect(ADMIN_TABLE_SCROLL_CLASS).toBe('dash-table-scroll');
  });

  it('default column sets are non-empty for every kind', () => {
    for (const kind of ['attendance', 'users', 'audit', 'devices', 'employees'] as const) {
      expect(DEFAULT_ADMIN_OVERVIEW_TABLE_COLUMNS[kind].length).toBeGreaterThan(0);
    }
  });
});
