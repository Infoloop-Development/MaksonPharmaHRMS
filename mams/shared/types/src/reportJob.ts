import { z } from 'zod';

export const ReportJobTypeSchema = z.enum(['compliance_monthly', 'financial']);
export type ReportJobType = z.infer<typeof ReportJobTypeSchema>;

export const ReportJobStatusSchema = z.enum(['queued', 'running', 'completed', 'failed']);
export type ReportJobStatus = z.infer<typeof ReportJobStatusSchema>;

export const ComplianceReportOverrideSchema = z.object({
  employeeId: z.string().min(1),
  totalHours: z.number().min(0),
});

export const ComplianceReportJobBodySchema = z.object({
  type: z.literal('compliance_monthly'),
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
  overrides: z.array(ComplianceReportOverrideSchema).max(500).default([]),
});

export const FinancialReportJobBodySchema = z.object({
  type: z.literal('financial'),
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
});

export const CreateReportJobBodySchema = z.discriminatedUnion('type', [
  ComplianceReportJobBodySchema,
  FinancialReportJobBodySchema,
]);

export type CreateReportJobBody = z.infer<typeof CreateReportJobBodySchema>;

export const ReportJobCreatedResponseSchema = z.object({
  jobId: z.string(),
  status: ReportJobStatusSchema,
});

export type ReportJobCreatedResponse = z.infer<typeof ReportJobCreatedResponseSchema>;

export const ReportJobStatusResponseSchema = z.object({
  jobId: z.string(),
  type: ReportJobTypeSchema,
  status: ReportJobStatusSchema,
  yearMonth: z.string(),
  filename: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  employeeCount: z.number().nullable().optional(),
  processedCount: z.number().nullable().optional(),
  createdAt: z.string().optional(),
  completedAt: z.string().nullable().optional(),
});

export type ReportJobStatusResponse = z.infer<typeof ReportJobStatusResponseSchema>;
