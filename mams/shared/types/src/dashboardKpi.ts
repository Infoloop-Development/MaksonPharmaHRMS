import { z } from 'zod';

export const DashboardKpiMetricIdSchema = z.enum([
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
]);
export type DashboardKpiMetricId = z.infer<typeof DashboardKpiMetricIdSchema>;

export const DashboardKpiConfigSchema = z
  .object({
    slots: z.array(DashboardKpiMetricIdSchema).length(4),
  })
  .refine((c) => new Set(c.slots).size === 4, { message: 'slots must be unique' });

export type DashboardKpiConfig = z.infer<typeof DashboardKpiConfigSchema>;

export const DEFAULT_DASHBOARD_KPI: DashboardKpiConfig = {
  slots: ['total_active', 'present', 'absent', 'late'],
};

export const ALL_DASHBOARD_KPI_METRICS: DashboardKpiMetricId[] = [
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
];
