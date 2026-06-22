import { z } from 'zod';

export const AdminOverviewBarMetricSchema = z.enum([
  'employees_total',
  'employees_active',
  'present',
  'absent',
  'late',
  'users_active',
  'audit_events',
  'login_success',
  'login_failed',
  'devices_online',
]);
export type AdminOverviewBarMetric = z.infer<typeof AdminOverviewBarMetricSchema>;

export const AdminOverviewDonutMetricSchema = z.enum([
  'attendance_punctuality',
  'users_by_role',
  'devices_status',
]);
export type AdminOverviewDonutMetric = z.infer<typeof AdminOverviewDonutMetricSchema>;

export const AdminOverviewChartsQuerySchema = z.object({
  date: z.string().optional(),
  barMetric: AdminOverviewBarMetricSchema.optional(),
  donutMetric: AdminOverviewDonutMetricSchema.optional().default('attendance_punctuality'),
});
export type AdminOverviewChartsQuery = z.infer<typeof AdminOverviewChartsQuerySchema>;

export const AdminOverviewChartsPayloadSchema = z.object({
  asOfDate: z.string(),
  weekRange: z.object({ start: z.string(), end: z.string() }),
  barMetric: AdminOverviewBarMetricSchema,
  donutMetric: AdminOverviewDonutMetricSchema,
  last7Days: z.object({
    dates: z.array(z.string()),
    employees_total: z.array(z.number()),
    employees_active: z.array(z.number()),
    present: z.array(z.number()),
    absent: z.array(z.number()),
    late: z.array(z.number()),
    users_active: z.array(z.number()),
    audit_events: z.array(z.number()),
    login_success: z.array(z.number()),
    login_failed: z.array(z.number()),
    devices_online: z.array(z.number()),
    weeklyOff: z.array(z.number()),
    halfDay: z.array(z.number()),
    dayShiftPresent: z.array(z.number()),
    nightShiftPresent: z.array(z.number()),
    totalEmployees: z.number(),
  }),
  weekPunctuality: z.object({
    date: z.string(),
    onTime: z.number(),
    delay: z.number(),
    onLeave: z.number(),
    totalActive: z.number(),
  }),
  usersByRole: z.object({
    'org.admin': z.number(),
    'hr.admin': z.number(),
    'hr.compliance': z.number(),
    'it.admin': z.number(),
  }),
  devicesStatus: z.object({
    online: z.number(),
    offline: z.number(),
  }),
});
export type AdminOverviewChartsPayload = z.infer<typeof AdminOverviewChartsPayloadSchema>;
