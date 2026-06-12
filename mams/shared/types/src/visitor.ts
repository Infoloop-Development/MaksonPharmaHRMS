import { z } from 'zod';

export const VisitorFieldTypeSchema = z.enum([
  'short_text',
  'long_text',
  'email',
  'phone',
  'date',
  'time',
  'dropdown',
  'radio',
  'checkbox',
  'file',
]);
export type VisitorFieldType = z.infer<typeof VisitorFieldTypeSchema>;

export const VisitorFieldSchema = z.object({
  id: z.string().min(1),
  type: VisitorFieldTypeSchema,
  label: z.string().min(1).max(200),
  placeholder: z.string().max(200).optional(),
  helpText: z.string().max(500).optional(),
  required: z.boolean().default(false),
  options: z.array(z.string().min(1).max(200)).optional(),
  order: z.number().int().min(0),
  maxFileBytes: z.number().int().min(1).max(5_242_880).optional(),
});
export type VisitorField = z.infer<typeof VisitorFieldSchema>;

export const VisitorRequestStatusSchema = z.enum(['Pending', 'Approved', 'Rejected']);
export type VisitorRequestStatus = z.infer<typeof VisitorRequestStatusSchema>;

export const VisitorSlugStrategySchema = z.enum(['keep', 'regenerate']);
export type VisitorSlugStrategy = z.infer<typeof VisitorSlugStrategySchema>;

const SELECTABLE_TYPES: VisitorFieldType[] = ['dropdown', 'radio', 'checkbox'];

export function visitorFieldNeedsOptions(type: VisitorFieldType): boolean {
  return SELECTABLE_TYPES.includes(type);
}

function refineVisitorFields(fields: VisitorField[], ctx: z.RefinementCtx): void {
  const ids = new Set<string>();
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i]!;
    if (ids.has(f.id)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Duplicate field id', path: [i, 'id'] });
    }
    ids.add(f.id);
    if (visitorFieldNeedsOptions(f.type)) {
      if (!f.options || f.options.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'At least one option is required',
          path: [i, 'options'],
        });
      }
    }
  }
}

export const VisitorFormCreateSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    fields: z.array(VisitorFieldSchema).min(1).max(100),
    isActive: z.boolean().default(true),
  })
  .superRefine((val, ctx) => refineVisitorFields(val.fields, ctx));
export type VisitorFormCreate = z.infer<typeof VisitorFormCreateSchema>;

export const VisitorFormUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    fields: z.array(VisitorFieldSchema).min(1).max(100).optional(),
    isActive: z.boolean().optional(),
    slugStrategy: VisitorSlugStrategySchema.default('keep'),
  })
  .superRefine((val, ctx) => {
    if (val.fields) refineVisitorFields(val.fields, ctx);
    const keys = ['title', 'description', 'fields', 'isActive', 'slugStrategy'] as const;
    if (keys.every((k) => val[k] === undefined)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide at least one field to update' });
    }
  });
export type VisitorFormUpdate = z.infer<typeof VisitorFormUpdateSchema>;

export const VisitorRequestListQuerySchema = z.object({
  status: VisitorRequestStatusSchema.optional(),
  formId: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type VisitorRequestListQuery = z.infer<typeof VisitorRequestListQuerySchema>;

export const VisitorRequestApproveSchema = z.object({
  approverNote: z.string().max(2000).optional(),
});
export type VisitorRequestApprove = z.infer<typeof VisitorRequestApproveSchema>;

export const VisitorRequestRejectSchema = z.object({
  approverNote: z.string().min(1).max(2000),
});
export type VisitorRequestReject = z.infer<typeof VisitorRequestRejectSchema>;

export const VisitorPublicSubmitSchema = z.object({
  responses: z.record(z.union([z.string(), z.array(z.string()), z.null()])),
  fileRefs: z
    .array(
      z.object({
        fieldId: z.string().min(1),
        storageKey: z.string().min(1),
      })
    )
    .default([]),
});
export type VisitorPublicSubmit = z.infer<typeof VisitorPublicSubmitSchema>;

const PHONE_RE = /^[+]?[\d\s()-]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validate visitor responses against a form field schema. */
export function validateVisitorResponses(
  fields: VisitorField[],
  responses: Record<string, string | string[] | null>,
  fileFieldIds: Set<string>
): { ok: true } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const sorted = [...fields].sort((a, b) => a.order - b.order);

  for (const field of sorted) {
    const raw = responses[field.id];
    const isFile = field.type === 'file';

    if (isFile) {
      const hasFile = fileFieldIds.has(field.id);
      if (field.required && !hasFile) errors[field.id] = 'This field is required';
      continue;
    }

    const empty =
      raw === null ||
      raw === undefined ||
      raw === '' ||
      (Array.isArray(raw) && raw.length === 0);

    if (field.required && empty) {
      errors[field.id] = 'This field is required';
      continue;
    }
    if (empty) continue;

    if (field.type === 'email' && typeof raw === 'string' && !EMAIL_RE.test(raw)) {
      errors[field.id] = 'Enter a valid email address';
    }
    if (field.type === 'phone' && typeof raw === 'string' && !PHONE_RE.test(raw)) {
      errors[field.id] = 'Enter a valid phone number';
    }
    if (field.type === 'date' && typeof raw === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      errors[field.id] = 'Enter a valid date';
    }
    if (field.type === 'time' && typeof raw === 'string' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(raw)) {
      errors[field.id] = 'Enter a valid time (HH:mm)';
    }
    if (visitorFieldNeedsOptions(field.type)) {
      const opts = new Set(field.options ?? []);
      if (field.type === 'checkbox' && Array.isArray(raw)) {
        for (const v of raw) {
          if (!opts.has(v)) errors[field.id] = 'Invalid selection';
        }
      } else if (typeof raw === 'string' && !opts.has(raw)) {
        errors[field.id] = 'Invalid selection';
      }
    }
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true };
}

export const VISITOR_FIELD_TYPE_LABELS: Record<VisitorFieldType, string> = {
  short_text: 'Short text',
  long_text: 'Long text',
  email: 'Email',
  phone: 'Phone number',
  date: 'Date',
  time: 'Time',
  dropdown: 'Dropdown',
  radio: 'Radio buttons',
  checkbox: 'Checkboxes',
  file: 'File upload',
};
