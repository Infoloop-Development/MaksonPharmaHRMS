import { describe, it, expect } from 'vitest';
import type { ActivityListItem } from '@mams/types';
import { activityPageBadge, formatActivityDescription } from './activityLabels';

function item(eventType: string, payload: Record<string, unknown> = {}): ActivityListItem {
  return {
    id: '1',
    occurredAt: '2026-06-02T10:00:00.000Z',
    eventType,
    entityType: null,
    entityId: null,
    payload,
  };
}

describe('activityPageBadge', () => {
  it('maps dashboard events to Dashboard', () => {
    expect(activityPageBadge('dashboard_layout_saved', {})).toBe('Dashboard');
    expect(activityPageBadge('dashboard_kpi_saved', {})).toBe('Dashboard');
    expect(activityPageBadge('ui.dashboard.export_xlsx', { page: 'dashboard' })).toBe('Dashboard');
  });
});

describe('formatActivityDescription', () => {
  it('formats dashboard_layout_saved with mobile chart', () => {
    const text = formatActivityDescription(
      item('dashboard_layout_saved', {
        mobileChart: 'bar',
        tablePosition: 'bottom',
        changedFields: ['mobileChart'],
      })
    );
    expect(text).toBe('Saved dashboard layout (mobile chart: Bar only)');
  });

  it('formats dashboard_kpi_saved with slot labels', () => {
    const text = formatActivityDescription(
      item('dashboard_kpi_saved', {
        slotsAfter: ['present', 'absent', 'late', 'weeklyOff'],
      })
    );
    expect(text).toBe('Customized KPI cards (present, absent, late, weeklyOff)');
  });

  it('formats export naming settings change', () => {
    const text = formatActivityDescription(
      item('settings_changed', {
        section: 'export_naming',
        changedFields: ['exportNaming'],
        before: { exportNaming: { dateFormat: 'DDMMYYYY', patterns: {} } },
        after: {
          exportNaming: {
            dateFormat: 'YYYYMMDD',
            patterns: { dashboardAttendanceXlsx: 'Attendance_{date}.xlsx' },
          },
        },
      })
    );
    expect(text).toContain('Export filename formats');
    expect(text).toContain('date format YYYYMMDD');
    expect(text).toContain('dashboardAttendanceXlsx pattern updated');
  });

  it('formats time display settings change', () => {
    const text = formatActivityDescription(
      item('settings_changed', {
        section: 'time_display',
        changedFields: ['timeFormat'],
        before: { timeFormat: '12h' },
        after: { timeFormat: '24h' },
      })
    );
    expect(text).toContain('Time display');
    expect(text).toContain('12-hour clock');
    expect(text).toContain('24-hour clock');
  });

  it('mentions export naming permission on user_created', () => {
    const text = formatActivityDescription(
      item('user_created', {
        email: 'hr@example.com',
        role: 'hr.admin',
        permissions: ['manage.export_naming'],
      })
    );
    expect(text).toContain('can configure export filenames');
  });

  it('formats permission grant on user_updated', () => {
    const text = formatActivityDescription(
      item('user_updated', {
        permissionsAdded: ['manage.export_naming'],
      })
    );
    expect(text).toContain('granted export filename formats');
  });

  it('formats leave_applied with status and days', () => {
    const text = formatActivityDescription(
      item('leave_applied', { status: 'Approved', totalDays: 2 })
    );
    expect(text).toBe('Applied leave (Approved, 2 day(s))');
  });

  it('maps leave events to Leave page badge', () => {
    expect(activityPageBadge('leave_approved', {})).toBe('Leave');
    expect(activityPageBadge('holiday_created', {})).toBe('Leave');
  });
});
