import { z } from'zod';

export const EmployeeChangeRequestStatusSchema = z.enum(['Flagged','Reviewed']);
export type EmployeeChangeRequestStatus = z.infer<typeof EmployeeChangeRequestStatusSchema>;

export const EmployeeChangeRequestTypeSchema = z.enum(['create','update','delete']);
export type EmployeeChangeRequestType = z.infer<typeof EmployeeChangeRequestTypeSchema>;

export const EmployeeChangeRequestProposedSchema = z.object({
    biometricId: z.string().min(1),
    name: z.string().min(1).max(120),
    gender: z.enum(['M','F','O']),
    department: z.string().min(1),
    designation: z.string().min(1),
    location: z.string().min(1),
    alternateShift: z.enum(['A', 'B', 'C']),
    weeklyOff: z.array(z.string()).min(1),
    joinDate: z.string(),
    status: z.enum(['Active', 'Inactive']),
    pan: z.string().optional(),
    aadhaar: z.string().optional(),
    bankAccountNumber: z.string().optional(),
    ifsc: z.string().optional(),
    bankName: z.string().optional(),
    accountHolderName: z.string().optional(),
    accountType: z.enum(['Savings', 'Current', 'Salary']).optional(),
    pfNumber: z.string().optional(),
    esiNumber: z.string().optional(),
});

export type EmployeeChangeRequestProposed = z.infer<typeof EmployeeChangeRequestProposedSchema>;

export const EmployeeChangeRequestBodySchema = z.discriminatedUnion('changeType', [
    z.object({
        changeType: z.literal('create'),
        proposedData: EmployeeChangeRequestProposedSchema,
        reason: z.string().min(10).max(2000)
    }),
    z.object({
        changeType: z.literal('update'),
        employeeId: z.string(),
        proposedData: EmployeeChangeRequestProposedSchema,
        reason: z.string().min(10).max(2000)
    }),
    z.object({
        changeType: z.literal('delete'),
        employeeId: z.string(),
        reason: z.string().min(10).max(2000)
    }),
]);

export type EmployeeChangeRequestBody = z.infer<typeof EmployeeChangeRequestBodySchema>;

export const EmployeeChangeRequestReviewSchema = z.object({
    action: z.enum(['keep', 'remove','revert','reinstate']),
    timeShift: z.enum(['Day','Night']).optional(),
    reviewNote: z.string().max(2000).optional(),
});

export type EmployeeChangeRequestReview = z.infer<typeof EmployeeChangeRequestReviewSchema>;

export const EmployeeChangeRequestPublicSchema = z.object({
  id: z.string(),
  changeType: EmployeeChangeRequestTypeSchema,
  employeeId: z.string().nullable(),
  employeeName: z.string().nullable(),
  employeeEmpCode: z.string().nullable(),
  proposedData: z.record(z.unknown()).nullable(),
  previousData: z.record(z.unknown()).nullable(),
  reason: z.string(),
  status: EmployeeChangeRequestStatusSchema,
  initiatedBy: z.string(),
  initiatedByName: z.string(),
  initiatedAt: z.string().datetime(),
  reviewedBy: z.string().nullable(),
  reviewedByName: z.string().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  reviewNote: z.string().nullable(),
});
export type EmployeeChangeRequestPublic = z.infer<typeof EmployeeChangeRequestPublicSchema>;

export const EmployeeChangeRequestListQuerySchema = z.object({
  status: EmployeeChangeRequestStatusSchema.optional(),
  changeType: EmployeeChangeRequestTypeSchema.optional(),
  employeeId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type EmployeeChangeRequestListQuery = z.infer<typeof EmployeeChangeRequestListQuerySchema>;
