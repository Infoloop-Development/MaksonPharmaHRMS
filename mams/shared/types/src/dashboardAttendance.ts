import { z } from 'zod';

export const DashboardAttendanceStatusFilterSchema = z.enum(['Present', 'Absent', 'Late', 'All']);
export type DashboardAttendanceStatusFilter = z.infer<typeof DashboardAttendanceStatusFilterSchema>;

export const DashboardAttendanceTimeShiftSchema = z.enum(['Day', 'Night']);
export type DashboardAttendanceTimeShift = z.infer<typeof DashboardAttendanceTimeShiftSchema>;

export const DashboardAttendanceQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  search: z.string().optional(),
  department: z.string().optional(),
  timeShift: DashboardAttendanceTimeShiftSchema.optional(),
  status: DashboardAttendanceStatusFilterSchema.optional().default('All'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export type DashboardAttendanceQuery = z.infer<typeof DashboardAttendanceQuerySchema>;

export const DashboardAttendanceDisplayStatusSchema = z.enum([
  'Present',
  'Absent',
  'Late',
  'Weekly Off',
  'Half Day',
]);
export type DashboardAttendanceDisplayStatus = z.infer<typeof DashboardAttendanceDisplayStatusSchema>;

export const DashboardAttendanceRowSchema = z.object({
  employeeId: z.string(),
  employeeName: z.string(),
  empCode: z.string(),
  department: z.string(),
  timeShift: DashboardAttendanceTimeShiftSchema,
  entryStamp: z.string(),
  exitStamp: z.string(),
  totalHoursWorked: z.number().nullable(),
  displayStatus: DashboardAttendanceDisplayStatusSchema,
});

export type DashboardAttendanceRow = z.infer<typeof DashboardAttendanceRowSchema>;

export const DashboardAttendanceListResponseSchema = z.object({
  viewMode: z.enum(['real', 'compliant']),
  date: z.string(),
  items: z.array(DashboardAttendanceRowSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export type DashboardAttendanceListResponse = z.infer<typeof DashboardAttendanceListResponseSchema>;

export const DashboardDepartmentsResponseSchema = z.object({
  departments: z.array(z.string()),
});

export type DashboardDepartmentsResponse = z.infer<typeof DashboardDepartmentsResponseSchema>;
