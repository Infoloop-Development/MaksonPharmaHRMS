import { z } from 'zod';

export const TimeShiftSchema = z.enum(['Day', 'Night']);
export type TimeShift = z.infer<typeof TimeShiftSchema>;

export const ComplianceShiftSchema = z.enum(['A', 'B', 'C']);
export type ComplianceShift = z.infer<typeof ComplianceShiftSchema>;

export const WeekdaySchema = z.enum([
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
]);
export type Weekday = z.infer<typeof WeekdaySchema>;

export const EmployeeStatusSchema = z.enum(['Active', 'Inactive']);
export type EmployeeStatus = z.infer<typeof EmployeeStatusSchema>;

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const EMP_CODE_REGEX = /^MKS\d{4}$/;

/** Phase 1: format only (no Verhoeff checksum per SoW). Stored as 12 consecutive digits. */
const AadhaarDigitsSchema = z
  .string()
  .transform((s) => s.replace(/\s/g, ''))
  .pipe(z.string().regex(/^\d{12}$/, 'Aadhaar must be exactly 12 digits'));

/** Indian domestic account numbers: digits only, typical length range after normalisation. */
const BankAccountSchema = z
  .string()
  .transform((s) => s.replace(/\D/g, ''))
  .pipe(
    z
      .string()
      .regex(/^\d{9,18}$/, 'Bank account must be 9–18 digits')
  );

/** UAN-style numeric or legacy regional PF numbers (slashes, letters). */
const PfNumberSchema = z
  .string()
  .trim()
  .min(5, 'PF number is too short')
  .max(40, 'PF number is too long')
  .regex(/^[A-Za-z0-9/.\-\s]+$/, 'PF number contains invalid characters');

/** ESI insurance number: 10- or 17-digit identifier (format only). */
const EsiNumberSchema = z
  .string()
  .transform((s) => s.replace(/\D/g, ''))
  .pipe(
    z
      .string()
      .regex(/^(\d{10}|\d{17})$/, 'ESI number must be 10 or 17 digits')
  );

export const SensitiveFieldsSchema = z.object({
  pan: z
    .string()
    .transform((s) => s.trim().toUpperCase())
    .pipe(z.string().regex(PAN_REGEX, 'PAN must be 5 letters + 4 digits + 1 letter')),
  aadhaar: AadhaarDigitsSchema,
  bankAccountNumber: BankAccountSchema,
  ifsc: z
    .string()
    .transform((s) => s.trim().toUpperCase())
    .pipe(z.string().regex(IFSC_REGEX, 'Invalid IFSC code')),
  accountHolderName: z.string().min(1).max(120),
  accountType: z.enum(['Savings', 'Current', 'Salary']),
  bankName: z.string().min(1).max(120),
  pfNumber: PfNumberSchema,
  esiNumber: EsiNumberSchema,
});
export type SensitiveFields = z.infer<typeof SensitiveFieldsSchema>;

export const EmployeeBaseSchema = z.object({
  empCode: z.string().regex(EMP_CODE_REGEX),
  name: z.string().min(1).max(120),
  gender: z.enum(['M', 'F', 'O']),
  department: z.string().min(1),
  designation: z.string().min(1),
  location: z.string().min(1),
  timeShift: TimeShiftSchema,
  alternateShift: ComplianceShiftSchema,
  weeklyOff: z.array(WeekdaySchema).min(1).max(2),
  joinDate: z.string().datetime(),
  biometricId: z.string().min(1),
  status: EmployeeStatusSchema,
});

// What HR types when creating - sensitive fields included
export const EmployeeCreateSchema = EmployeeBaseSchema.merge(SensitiveFieldsSchema);
export type EmployeeCreate = z.infer<typeof EmployeeCreateSchema>;

/** POST body from UI / API: `empCode` is assigned by the server. */
export const EmployeeCreateBodySchema = EmployeeCreateSchema.omit({ empCode: true });
export type EmployeeCreateBody = z.infer<typeof EmployeeCreateBodySchema>;

/** Step 1 wizard validation (assignment + profile, no statutory/bank). */
export const EmployeeCreateStep1Schema = EmployeeCreateBodySchema.pick({
  biometricId: true,
  name: true,
  department: true,
  designation: true,
  location: true,
  timeShift: true,
  alternateShift: true,
  weeklyOff: true,
  joinDate: true,
  gender: true,
  status: true,
});
export type EmployeeCreateStep1 = z.infer<typeof EmployeeCreateStep1Schema>;

/** PATCH body: partial updates; `empCode` is never editable via API. */
export const EmployeePatchBodySchema = EmployeeCreateSchema.omit({ empCode: true }).partial();
export type EmployeePatchBody = z.infer<typeof EmployeePatchBodySchema>;

// What gets returned to clients - sensitive fields are MASKED strings by default
export const EmployeeMaskedSchema = EmployeeBaseSchema.extend({
  id: z.string(),
  pan: z.string(), // 'XXXXXX1234' format
  aadhaar: z.string(),
  bankAccountNumber: z.string(),
  ifsc: z.string(),
  accountHolderName: z.string(),
  accountType: z.enum(['Savings', 'Current', 'Salary']),
  bankName: z.string(),
  pfNumber: z.string(),
  esiNumber: z.string(),
  isMasked: z.literal(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type EmployeeMasked = z.infer<typeof EmployeeMaskedSchema>;

// What an authorised user sees when explicitly unmasking - audit-logged
export const EmployeeUnmaskedSchema = EmployeeMaskedSchema.extend({
  isMasked: z.literal(false),
});
export type EmployeeUnmasked = z.infer<typeof EmployeeUnmaskedSchema>;

export const EmployeeListQuerySchema = z.object({
  search: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  status: EmployeeStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type EmployeeListQuery = z.infer<typeof EmployeeListQuerySchema>;

export const EmployeeListResponseSchema = z.object({
  items: z.array(EmployeeMaskedSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type EmployeeListResponse = z.infer<typeof EmployeeListResponseSchema>;
