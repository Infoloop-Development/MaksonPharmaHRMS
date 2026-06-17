import { z } from 'zod';
import {
  AdminOverviewWidgetsConfigSchema,
  DEFAULT_ADMIN_OVERVIEW_WIDGETS,
  type AdminOverviewWidgetsConfig,
} from './adminOverviewWidget.js';

export const AdminOverviewAnalyticsQuerySchema = z.object({
  date: z.string().optional(),
});
export type AdminOverviewAnalyticsQuery = z.infer<typeof AdminOverviewAnalyticsQuerySchema>;

const LabeledCountSchema = z.object({
  label: z.string(),
  value: z.number(),
});

export const AdminOverviewAnalyticsPayloadSchema = z.object({
  asOfDate: z.string(),
  weekRange: z.object({ start: z.string(), end: z.string() }),
  selectedDate: z.string(),
  last7Days: z.object({
    dates: z.array(z.string()),
    totalEmployees: z.number(),
    present: z.array(z.number()),
    absent: z.array(z.number()),
    late: z.array(z.number()),
    attendance_rate: z.array(z.number()),
    employees_active: z.array(z.number()),
    employees_total: z.array(z.number()),
    users_active: z.array(z.number()),
    audit_events: z.array(z.number()),
    login_success: z.array(z.number()),
    login_failed: z.array(z.number()),
    devices_online: z.array(z.number()),
    weeklyOff: z.array(z.number()),
    halfDay: z.array(z.number()),
    dayShiftPresent: z.array(z.number()),
    nightShiftPresent: z.array(z.number()),
  }),
  weekPunctuality: z.object({
    date: z.string(),
    onTime: z.number(),
    delay: z.number(),
    onLeave: z.number(),
    totalActive: z.number(),
  }),
  breakdowns: z.object({
    usersByRole: z.object({
      'org.admin': z.number(),
      'hr.admin': z.number(),
      'hr.compliance': z.number(),
      'it.admin': z.number(),
    }),
    devicesStatus: z.object({ online: z.number(), offline: z.number() }),
    attendanceByStatus: z.object({
      present: z.number(),
      absent: z.number(),
      weeklyOff: z.number(),
      halfDay: z.number(),
      late: z.number(),
    }),
    auditByModule: z.array(LabeledCountSchema),
    auditEventTypes: z.array(LabeledCountSchema),
    topDepartmentsPresent: z.array(LabeledCountSchema),
    devicesByLocation: z.array(LabeledCountSchema),
    employeesByStatus: z.array(LabeledCountSchema),
  }),
});

export type AdminOverviewAnalyticsPayload = z.infer<typeof AdminOverviewAnalyticsPayloadSchema>;

/** Migrate legacy adminOverviewLayout (bar/donut/table) to widget config. */
export function migrateAdminOverviewWidgets(input: unknown): AdminOverviewWidgetsConfig {
  const parsed = AdminOverviewWidgetsConfigSchema.safeParse(input);
  if (parsed.success) return parsed.data;

  // Legacy: had adminOverviewLayout with bar+donut rows — map to 2 default widgets
  if (input && typeof input === 'object' && 'rows' in (input as object)) {
    return DEFAULT_ADMIN_OVERVIEW_WIDGETS;
  }

  // Partial widget array without wrapper
  const widgetsOnly = z.array(z.unknown()).safeParse(input);
  if (widgetsOnly.success && widgetsOnly.data.length >= 2) {
    const wrapped = AdminOverviewWidgetsConfigSchema.safeParse({
      widgets: widgetsOnly.data,
      tablePosition: 'bottom',
      showTable: true,
    });
    if (wrapped.success) return wrapped.data;
  }

  return DEFAULT_ADMIN_OVERVIEW_WIDGETS;
}

export { AdminOverviewWidgetsConfigSchema, DEFAULT_ADMIN_OVERVIEW_WIDGETS };
