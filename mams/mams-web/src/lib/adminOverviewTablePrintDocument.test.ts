import { describe, it, expect } from 'vitest';
import type { DashboardAttendanceRow } from '@mams/types';
import {
  buildAttendanceFilterSubtitle,
  buildAttendancePrintColumns,
  buildAttendancePrintRows,
  buildGenericFilterSubtitle,
  buildGenericPrintColumns,
  buildGenericPrintRows,
} from './adminOverviewTablePrintDocument';

describe('adminOverviewTablePrintDocument', () => {
  it('buildGenericPrintColumns respects visible columns in config', () => {
    const cols = buildGenericPrintColumns({
      kind: 'users',
      columns: ['name', 'email', 'role'],
    });
    expect(cols.map((c) => c.key)).toEqual(['name', 'email', 'role']);
    expect(cols[0]?.label).toBe('Name');
  });

  it('buildGenericPrintRows formats booleans and roles', () => {
    const rows = buildGenericPrintRows(
      [{ name: 'Jane', role: 'org.admin', active: true, email: 'j@x.com' }],
      ['name', 'email', 'role', 'active']
    );
    expect(rows[0]).toEqual({
      name: 'Jane',
      email: 'j@x.com',
      role: 'Organization Admin',
      active: 'Yes',
    });
  });

  it('buildGenericFilterSubtitle joins active filters for users', () => {
    const subtitle = buildGenericFilterSubtitle(
      { kind: 'users', columns: ['name'] },
      { role: 'org.admin', active: 'yes', search: 'jane', online: 'All', location: '', department: '', status: '', eventType: '' }
    );
    expect(subtitle).toContain('Search: jane');
    expect(subtitle).toContain('Role: Organization Admin');
    expect(subtitle).toContain('Status: Active');
  });

  it('buildAttendancePrintColumns uses admin columns when visibleColumns set', () => {
    const cols = buildAttendancePrintColumns(['name', 'status']);
    expect(cols.map((c) => c.key)).toEqual(['name', 'status']);
    expect(cols.map((c) => c.label)).toEqual(['Employee', 'Status']);
  });

  it('buildAttendancePrintColumns includes entry/exit for full dashboard table', () => {
    const cols = buildAttendancePrintColumns(undefined);
    expect(cols.map((c) => c.key)).toEqual([
      'name',
      'empCode',
      'department',
      'shift',
      'entry',
      'exit',
      'hours',
      'status',
    ]);
  });

  it('buildAttendancePrintRows maps attendance fields', () => {
    const row: DashboardAttendanceRow = {
      employeeId: '1',
      employeeName: 'Rajesh Patel',
      empCode: 'E001',
      department: 'Production',
      timeShift: 'Day',
      entryStamp: '2026-06-02T06:05:00.000Z',
      exitStamp: '2026-06-02T18:00:00.000Z',
      totalHoursWorked: 11.9,
      displayStatus: 'Present',
    };
    const rows = buildAttendancePrintRows([row], ['name', 'empCode', 'status']);
    expect(rows[0]?.name).toBe('Rajesh Patel');
    expect(rows[0]?.empCode).toBe('E001');
    expect(rows[0]?.status).toBe('Present');
  });

  it('buildAttendanceFilterSubtitle includes date filters', () => {
    const subtitle = buildAttendanceFilterSubtitle({
      date: '2026-06-02',
      search: 'raj',
      department: 'Production',
      timeShift: 'Day',
      status: 'Present',
    });
    expect(subtitle).toContain('Search: raj');
    expect(subtitle).toContain('Department: Production');
    expect(subtitle).toContain('Shift: Day');
    expect(subtitle).toContain('Status: Present');
  });
});
