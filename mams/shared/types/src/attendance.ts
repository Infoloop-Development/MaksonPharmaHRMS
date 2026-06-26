import { z } from 'zod';
import { SortDirSchema } from './sort.js';

export const PunchTypeSchema = z.enum(['IN', 'OUT', 'OTHER']);
export type PunchType = z.infer<typeof PunchTypeSchema>;

export const DayTypeSchema = z.enum(['Working', 'Weekly Off', 'Absent']);
export type DayType = z.infer<typeof DayTypeSchema>;

export const AttendanceStatusSchema = z.enum(['Present', 'Absent', 'Weekly Off', 'Half Day']);
export type AttendanceStatus = z.infer<typeof AttendanceStatusSchema>;

export const AttendanceRawPublicSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  biometricId: z.string(),
  deviceId: z.string().nullable(),
  punchType: PunchTypeSchema,
  rawTimestamp: z.string().datetime(),
  rawDate: z.string(), // YYYY-MM-DD in IST
  receivedAt: z.string().datetime(),
});
export type AttendanceRawPublic = z.infer<typeof AttendanceRawPublicSchema>;

/** Query for live / historical raw punch list (Attendance Log). */
export const AttendanceRawListQuerySchema = z.object({
  search: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  punchType: PunchTypeSchema.optional(),
  outsideShiftOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  sortBy: z.enum(['rawTimestamp', 'name', 'empCode', 'punchType']).optional(),
  sortDir: SortDirSchema.optional(),
  /** Live feed shortcut: return first `limit` rows (page forced to 1). */
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
export type AttendanceRawListQuery = z.infer<typeof AttendanceRawListQuerySchema>;

export const AttendanceRawListResponseSchema = z.object({
  items: z.array(z.unknown()),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  truncated: z.boolean().optional(),
});
export type AttendanceRawListResponse = z.infer<typeof AttendanceRawListResponseSchema>;

/** Query for raw punch KPI stats (excludes punchType so tiles show full breakdown). */
export const AttendanceRawStatsQuerySchema = z.object({
  search: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type AttendanceRawStatsQuery = z.infer<typeof AttendanceRawStatsQuerySchema>;

export const AttendanceRawStatsScopeSchema = z.enum(['today', 'date', 'range', 'all']);
export type AttendanceRawStatsScope = z.infer<typeof AttendanceRawStatsScopeSchema>;

export const AttendanceRawStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  in: z.number().int().nonnegative(),
  out: z.number().int().nonnegative(),
  other: z.number().int().nonnegative(),
  uniqueEmployees: z.number().int().nonnegative(),
  scope: AttendanceRawStatsScopeSchema,
  scopeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type AttendanceRawStats = z.infer<typeof AttendanceRawStatsSchema>;

// REAL view payload (hr.admin sees this)
export const AttendanceDerivedRealSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  date: z.string(),
  realEntryAt: z.string().datetime().nullable(),
  realExitAt: z.string().datetime().nullable(),
  realGrossHours: z.number(),
  realNetHours: z.number(),
  breakMinutes: z.number(),
  otHours: z.number(),
  dayType: DayTypeSchema,
  status: AttendanceStatusSchema,
});
export type AttendanceDerivedReal = z.infer<typeof AttendanceDerivedRealSchema>;

// COMPLIANT view payload (hr.compliance sees this)
export const AttendanceDerivedCompliantSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  date: z.string(),
  compliantEntryAt: z.string().datetime().nullable(),
  compliantExitAt: z.string().datetime().nullable(),
  compliantHours: z.number(),
  dayType: DayTypeSchema,
  status: AttendanceStatusSchema,
});
export type AttendanceDerivedCompliant = z.infer<typeof AttendanceDerivedCompliantSchema>;

// eSSL ADMS push payload (received from devices, parsed line-by-line)
// Each line: <userId>\t<timestamp>\t<status>\t<verifyType>\t<workCode>\t<reserved1>\t<reserved2>
export const ESSLPunchSchema = z.object({
  userId: z.string(),         // device-side user id == employee.biometricId
  timestamp: z.string(),      // 'YYYY-MM-DD HH:MM:SS' in device-local IST
  status: z.number().int(),   // 0=in, 1=out, 2=break-out, 3=break-in, 4=ot-in, 5=ot-out
  verifyType: z.number().int(),
  workCode: z.number().int().optional(),
});
export type ESSLPunch = z.infer<typeof ESSLPunchSchema>;
