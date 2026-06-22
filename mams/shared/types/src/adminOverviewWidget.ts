import { z } from 'zod';

export const AdminChartTypeSchema = z.enum([
  'line',
  'area',
  'bar',
  'stacked_bar',
  'pie',
  'donut',
  'horizontal_bar',
]);
export type AdminChartType = z.infer<typeof AdminChartTypeSchema>;

/** Single-series / trend metrics */
export const AdminTrendMetricSchema = z.enum([
  'present',
  'absent',
  'late',
  'attendance_rate',
  'employees_active',
  'employees_total',
  'users_active',
  'audit_events',
  'login_success',
  'login_failed',
  'devices_online',
]);
export type AdminTrendMetric = z.infer<typeof AdminTrendMetricSchema>;

/** Stacked / multi-series metrics */
export const AdminStackedMetricSchema = z.enum([
  'attendance_status',
  'login_outcomes',
  'shift_present',
]);
export type AdminStackedMetric = z.infer<typeof AdminStackedMetricSchema>;

/** Donut breakdown metrics */
export const AdminDonutMetricSchema = z.enum([
  'attendance_punctuality',
  'users_by_role',
  'devices_status',
  'attendance_by_status',
  'audit_by_module',
]);
export type AdminDonutMetric = z.infer<typeof AdminDonutMetricSchema>;

/** Horizontal bar / ranking metrics */
export const AdminRankingMetricSchema = z.enum([
  'top_departments_present',
  'users_by_role',
  'audit_event_types',
  'devices_by_location',
  'employees_by_status',
]);
export type AdminRankingMetric = z.infer<typeof AdminRankingMetricSchema>;

export const AdminChartMetricIdSchema = z.union([
  AdminTrendMetricSchema,
  AdminStackedMetricSchema,
  AdminDonutMetricSchema,
  AdminRankingMetricSchema,
]);
export type AdminChartMetricId = z.infer<typeof AdminChartMetricIdSchema>;

export const METRICS_BY_CHART_TYPE: Record<AdminChartType, readonly AdminChartMetricId[]> = {
  line: [
    'present',
    'absent',
    'late',
    'attendance_rate',
    'employees_active',
    'users_active',
    'audit_events',
    'login_success',
    'login_failed',
    'devices_online',
  ],
  area: [
    'present',
    'absent',
    'late',
    'attendance_rate',
    'employees_active',
    'users_active',
    'audit_events',
    'login_success',
    'login_failed',
    'devices_online',
  ],
  bar: [
    'present',
    'absent',
    'late',
    'attendance_rate',
    'employees_active',
    'users_active',
    'audit_events',
    'login_success',
    'login_failed',
    'devices_online',
  ],
  stacked_bar: ['attendance_status', 'login_outcomes', 'shift_present'],
  pie: [
    'attendance_punctuality',
    'users_by_role',
    'devices_status',
    'attendance_by_status',
    'audit_by_module',
  ],
  donut: [
    'attendance_punctuality',
    'users_by_role',
    'devices_status',
    'attendance_by_status',
    'audit_by_module',
  ],
  horizontal_bar: [
    'top_departments_present',
    'users_by_role',
    'audit_event_types',
    'devices_by_location',
    'employees_by_status',
  ],
};

export function isMetricAllowedForChartType(
  chartType: AdminChartType,
  metricId: AdminChartMetricId
): boolean {
  return METRICS_BY_CHART_TYPE[chartType].includes(metricId);
}

export const AdminOverviewWidgetSchema = z
  .object({
    id: z.string().min(1).max(64),
    chartType: AdminChartTypeSchema,
    metricId: AdminChartMetricIdSchema,
    secondaryMetricId: AdminChartMetricIdSchema.optional(),
  })
  .superRefine((val, ctx) => {
    if (!isMetricAllowedForChartType(val.chartType, val.metricId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Metric "${val.metricId}" is not allowed for chart type "${val.chartType}"`,
      });
    }
    if (val.secondaryMetricId && !isMetricAllowedForChartType(val.chartType, val.secondaryMetricId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Secondary metric "${val.secondaryMetricId}" is not allowed for chart type "${val.chartType}"`,
      });
    }
  });

export type AdminOverviewWidget = z.infer<typeof AdminOverviewWidgetSchema>;

export const ADMIN_OVERVIEW_WIDGET_MIN = 2;
export const ADMIN_OVERVIEW_WIDGET_MAX = 8;

export const AdminOverviewWidgetsConfigSchema = z
  .object({
    widgets: z.array(AdminOverviewWidgetSchema).min(ADMIN_OVERVIEW_WIDGET_MIN).max(ADMIN_OVERVIEW_WIDGET_MAX),
    tablePosition: z.enum(['top', 'bottom']).default('bottom'),
    showTable: z.boolean().default(true),
  })
  .superRefine((val, ctx) => {
    const ids = new Set<string>();
    for (const w of val.widgets) {
      if (ids.has(w.id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate widget id "${w.id}"` });
      }
      ids.add(w.id);
    }
  });

export type AdminOverviewWidgetsConfig = z.infer<typeof AdminOverviewWidgetsConfigSchema>;

export const DEFAULT_ADMIN_OVERVIEW_WIDGETS: AdminOverviewWidgetsConfig = {
  widgets: [
    { id: 'w1', chartType: 'line', metricId: 'present' },
    { id: 'w2', chartType: 'donut', metricId: 'attendance_punctuality' },
  ],
  tablePosition: 'bottom',
  showTable: true,
};

export function createDefaultWidgetId(index: number): string {
  return `w${index + 1}`;
}
