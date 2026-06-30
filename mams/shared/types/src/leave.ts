import { z } from 'zod';
import { SortDirSchema } from './sort.js';

export const LeaveStatusSchema = z.enum(['Pending', 'Approved', 'Rejected', 'Cancelled']);
export type LeaveStatus = z.infer<typeof LeaveStatusSchema>;

export const HalfDayPortionSchema = z.enum(['first', 'second']);
export type HalfDayPortion = z.infer<typeof HalfDayPortionSchema>;

export const HolidayTypeSchema = z.enum(['National', 'Regional', 'Company']);
export type HolidayType = z.infer<typeof HolidayTypeSchema>;

export const LeaveQuotaResetPolicySchema = z.enum([
  'calendar_year',
  'financial_year',
  'joining_anniversary',
]);
export type LeaveQuotaResetPolicy = z.infer<typeof LeaveQuotaResetPolicySchema>;

export const LeaveTypePublicSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  paid: z.boolean(),
  halfDayEligible: z.boolean(),
  maxConsecutiveDays: z.number().int().positive().nullable(),
  requiresDocument: z.boolean(),
  annualQuotaDefault: z.number().nonnegative(),
  active: z.boolean(),
  sortOrder: z.number().int(),
});
export type LeaveTypePublic = z.infer<typeof LeaveTypePublicSchema>;

export const LeaveTypeCreateSchema = z.object({
  code: z.string().trim().min(1).max(40).regex(/^[a-z0-9_]+$/),
  name: z.string().trim().min(1).max(120),
  paid: z.boolean().default(true),
  halfDayEligible: z.boolean().default(true),
  maxConsecutiveDays: z.number().int().positive().nullable().optional(),
  requiresDocument: z.boolean().default(false),
  annualQuotaDefault: z.number().nonnegative().default(0),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});
export type LeaveTypeCreate = z.infer<typeof LeaveTypeCreateSchema>;

export const LeaveTypePatchSchema = LeaveTypeCreateSchema.partial().omit({ code: true });
export type LeaveTypePatch = z.infer<typeof LeaveTypePatchSchema>;

export const HolidayPublicSchema = z.object({
  id: z.string(),
  name: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: HolidayTypeSchema,
  departments: z.array(z.string()),
  locations: z.array(z.string()),
});
export type HolidayPublic = z.infer<typeof HolidayPublicSchema>;

export const HolidayCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: HolidayTypeSchema.default('National'),
  departments: z.array(z.string()).default([]),
  locations: z.array(z.string()).default([]),
});
export type HolidayCreate = z.infer<typeof HolidayCreateSchema>;

export const HolidayPatchSchema = HolidayCreateSchema.partial();
export type HolidayPatch = z.infer<typeof HolidayPatchSchema>;

export const LeaveApplicationCreateSchema = z
  .object({
    employeeId: z.string().min(1),
    leaveTypeId: z.string().min(1),
    fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    halfDayPortion: HalfDayPortionSchema.optional(),
    reason: z.string().trim().min(1).max(2000),
    notifyEmployee: z.boolean().default(false),
    /** Admin apply = Approved immediately; otherwise Pending (future self-service). */
    adminApply: z.boolean().default(true),
  })
  .superRefine((val, ctx) => {
    if (val.fromDate > val.toDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'fromDate must be on or before toDate', path: ['toDate'] });
    }
    if (val.halfDayPortion && val.fromDate !== val.toDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Half day leave must use a single date',
        path: ['toDate'],
      });
    }
  });
export type LeaveApplicationCreate = z.infer<typeof LeaveApplicationCreateSchema>;

export const LeaveDecisionSchema = z.object({
  note: z.string().trim().max(2000).optional(),
});
export type LeaveDecision = z.infer<typeof LeaveDecisionSchema>;

export const LeaveRejectSchema = z.object({
  note: z.string().trim().min(1).max(2000),
});
export type LeaveReject = z.infer<typeof LeaveRejectSchema>;

export const LeaveQuotaAdjustSchema = z.object({
  employeeId: z.string().min(1),
  leaveTypeId: z.string().min(1),
  delta: z.number(),
  reason: z.string().trim().min(1).max(500),
});
export type LeaveQuotaAdjust = z.infer<typeof LeaveQuotaAdjustSchema>;

export const LeaveQuotaApplyDefaultSchema = z.object({
  employeeIds: z.array(z.string()).optional(),
  department: z.string().optional(),
});
export type LeaveQuotaApplyDefault = z.infer<typeof LeaveQuotaApplyDefaultSchema>;

export const LeaveListQuerySchema = z.object({
  search: z.string().optional(),
  employeeId: z.string().optional(),
  leaveTypeId: z.string().optional(),
  status: LeaveStatusSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  startsFrom: z.string().optional(),
  startsTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  sortBy: z.enum(['employee', 'fromDate', 'totalDays', 'status']).optional(),
  sortDir: SortDirSchema.optional(),
});
export type LeaveListQuery = z.infer<typeof LeaveListQuerySchema>;

export const LeaveQuotaPreviewQuerySchema = z.object({
  employeeId: z.string().min(1),
  leaveTypeId: z.string().min(1),
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type LeaveQuotaPreviewQuery = z.infer<typeof LeaveQuotaPreviewQuerySchema>;

export const DEFAULT_LEAVE_TYPES: Omit<LeaveTypeCreate, 'sortOrder'>[] = [
  {
    code: 'paid_leave',
    name: 'Paid Leave',
    paid: true,
    halfDayEligible: true,
    maxConsecutiveDays: 15,
    requiresDocument: false,
    annualQuotaDefault: 12,
    active: true,
  },
  {
    code: 'lwp',
    name: 'Leave Without Pay',
    paid: false,
    halfDayEligible: true,
    maxConsecutiveDays: null,
    requiresDocument: false,
    annualQuotaDefault: 0,
    active: true,
  },
  {
    code: 'casual_leave',
    name: 'Casual Leave',
    paid: true,
    halfDayEligible: true,
    maxConsecutiveDays: 3,
    requiresDocument: false,
    annualQuotaDefault: 6,
    active: true,
  },
  {
    code: 'sick_leave',
    name: 'Sick Leave',
    paid: true,
    halfDayEligible: true,
    maxConsecutiveDays: 7,
    requiresDocument: true,
    annualQuotaDefault: 6,
    active: true,
  },
];
