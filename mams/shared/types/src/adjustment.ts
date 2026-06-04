import { z } from 'zod';

export const AdjustmentReasonSchema = z.enum([
  'missed_punch',
  'wrong_device',
  'system_outage',
  'shift_swap',
  'other',
]);
export type AdjustmentReason = z.infer<typeof AdjustmentReasonSchema>;

export const AdjustmentStatusSchema = z.enum(['Pending', 'Approved', 'Rejected']);
export type AdjustmentStatus = z.infer<typeof AdjustmentStatusSchema>;

export const AdjustmentCreateSchema = z.object({
  employeeId: z.string(),
  date: z.string(), // YYYY-MM-DD
  fieldChanged: z.enum(['realEntryAt', 'realExitAt', 'breakMinutes', 'dayType', 'status']),
  previousValue: z.unknown(),
  newValue: z.unknown(),
  reason: AdjustmentReasonSchema,
  justification: z.string().min(10).max(2000),
  evidenceRef: z.string().min(1),
  salaryImpactNote: z.string().min(1).max(500),
});
export type AdjustmentCreate = z.infer<typeof AdjustmentCreateSchema>;

export const AdjustmentDecisionSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  approverNote: z.string().max(2000).optional(),
});
export type AdjustmentDecision = z.infer<typeof AdjustmentDecisionSchema>;

export const AdjustmentPublicSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  date: z.string(),
  fieldChanged: z.string(),
  previousValue: z.unknown(),
  newValue: z.unknown(),
  reason: AdjustmentReasonSchema,
  justification: z.string(),
  evidenceRef: z.string(),
  salaryImpactNote: z.string(),
  status: AdjustmentStatusSchema,
  initiatedBy: z.string(),
  initiatedAt: z.string().datetime(),
  decidedBy: z.string().nullable(),
  decidedAt: z.string().datetime().nullable(),
  approverNote: z.string().nullable(),
});
export type AdjustmentPublic = z.infer<typeof AdjustmentPublicSchema>;
