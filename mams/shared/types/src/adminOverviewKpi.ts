import { z } from 'zod';

export const AdminOverviewKpiMetricIdSchema = z.enum([
  'active_users',
  'org_admins',
  'inactive_users',
  'devices_online',
  'devices_offline',
  'audit_events_7d',
  'failed_logins_7d',
  'api_status',
  'total_active',
  'present',
  'absent',
  'late',
  'on_time',
  'attendance_rate',
  'weekly_off',
  'half_day',
  'day_shift',
  'night_shift',
  'pending_adjustments',
]);
export type AdminOverviewKpiMetricId = z.infer<typeof AdminOverviewKpiMetricIdSchema>;

export const AdminOverviewKpiConfigSchema = z
  .object({
    slots: z.array(AdminOverviewKpiMetricIdSchema).length(4),
  })
  .refine((c) => new Set(c.slots).size === 4, { message: 'slots must be unique' });

export type AdminOverviewKpiConfig = z.infer<typeof AdminOverviewKpiConfigSchema>;

export const DEFAULT_ADMIN_OVERVIEW_KPI: AdminOverviewKpiConfig = {
  slots: ['active_users', 'org_admins', 'devices_online', 'total_active'],
};

export const ALL_ADMIN_OVERVIEW_KPI_METRICS: AdminOverviewKpiMetricId[] = [
  'active_users',
  'org_admins',
  'inactive_users',
  'devices_online',
  'devices_offline',
  'audit_events_7d',
  'failed_logins_7d',
  'api_status',
  'total_active',
  'present',
  'absent',
  'late',
  'on_time',
  'attendance_rate',
  'weekly_off',
  'half_day',
  'day_shift',
  'night_shift',
  'pending_adjustments',
];
