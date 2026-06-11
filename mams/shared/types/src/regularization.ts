import { z } from 'zod';

export const RegularizationTypeSchema = z.enum([
  'missed_in',
  'missed_out',
  'missed_both',
  'wrong_punch',
  'other',
]);
export type RegularizationType = z.infer<typeof RegularizationTypeSchema>;

export const RegularizationStatusSchema = z.enum(['Pending', 'Approved', 'Rejected']);
export type RegularizationStatus = z.infer<typeof RegularizationStatusSchema>;

const IstTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm (24h)');

function refineRegularizationTimes(
  val: { type: RegularizationType; requestedInTime?: string; requestedOutTime?: string },
  ctx: z.RefinementCtx
) {
  const needsIn = val.type === 'missed_in' || val.type === 'missed_both' || val.type === 'wrong_punch';
  const needsOut = val.type === 'missed_out' || val.type === 'missed_both' || val.type === 'wrong_punch';
  if (needsIn && !val.requestedInTime) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'IN time is required for this type', path: ['requestedInTime'] });
  }
  if (needsOut && !val.requestedOutTime) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'OUT time is required for this type', path: ['requestedOutTime'] });
  }
}

export const RegularizationCreateSchema = z
  .object({
    employeeId: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    type: RegularizationTypeSchema,
    requestedInTime: IstTimeSchema.optional(),
    requestedOutTime: IstTimeSchema.optional(),
    reason: z.string().min(10).max(2000),
    remarks: z.string().max(500).optional(),
  })
  .superRefine(refineRegularizationTimes);
export type RegularizationCreate = z.infer<typeof RegularizationCreateSchema>;

export const RegularizationApproveSchema = z.object({
  approverNote: z.string().max(2000).optional(),
});
export type RegularizationApprove = z.infer<typeof RegularizationApproveSchema>;

export const RegularizationRejectSchema = z.object({
  approverNote: z.string().min(1).max(2000),
});
export type RegularizationReject = z.infer<typeof RegularizationRejectSchema>;

export const RegularizationListQuerySchema = z.object({
  status: RegularizationStatusSchema.optional(),
  employeeId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type RegularizationListQuery = z.infer<typeof RegularizationListQuerySchema>;

export const RegularizationPreviewQuerySchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type RegularizationPreviewQuery = z.infer<typeof RegularizationPreviewQuerySchema>;

export function regularizationTypeNeedsIn(type: RegularizationType): boolean {
  return type === 'missed_in' || type === 'missed_both' || type === 'wrong_punch';
}

export function regularizationTypeNeedsOut(type: RegularizationType): boolean {
  return type === 'missed_out' || type === 'missed_both' || type === 'wrong_punch';
}
