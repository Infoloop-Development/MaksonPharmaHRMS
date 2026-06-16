import { z } from 'zod';
import {
  normalizeLoomUrl,
  normalizeYoutubeUrl,
  isAllowedIntroImageUrl,
} from './visitorIntroMedia.js';
import { VisitorFormLocaleSchema, VisitorMultilingualSchema, type VisitorFormLocale } from './visitorLocales.js';

export {
  VISITOR_INTRO_IMAGE_FIELD_ID,
  VISITOR_INTRO_VIDEO_FIELD_ID,
  parseYoutubeVideoId,
  parseLoomVideoId,
  normalizeYoutubeUrl,
  normalizeLoomUrl,
  youtubeEmbedUrl,
  loomEmbedUrl,
  isAllowedIntroImageUrl,
} from './visitorIntroMedia.js';

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

/** Mongoose/JSON often sends null for absent optional fields; Zod `.optional()` expects undefined. */
function coalesceNull<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((val) => (val === null ? undefined : val), schema);
}

export const VisitorFieldSchema = z.object({
  id: z.string().min(1),
  type: VisitorFieldTypeSchema,
  label: z.string().min(1).max(200),
  placeholder: coalesceNull(z.string().max(200).optional()),
  helpText: coalesceNull(z.string().max(500).optional()),
  required: z.boolean().default(false),
  options: coalesceNull(z.array(z.string().min(1).max(200)).optional()),
  order: z.number().int().min(0),
  maxFileBytes: coalesceNull(z.number().int().min(1).max(5_242_880).optional()),
});
export type VisitorField = z.infer<typeof VisitorFieldSchema>;

export const VisitorIntroImageSchema = z.object({
  source: z.enum(['url', 'upload']),
  url: coalesceNull(z.string().url().optional()),
  storageKey: coalesceNull(z.string().min(1).optional()),
  order: coalesceNull(z.number().int().min(0).optional()),
});
export type VisitorIntroImage = z.infer<typeof VisitorIntroImageSchema>;

export const VisitorIntroVideoSchema = z.object({
  source: z.enum(['youtube', 'loom', 'upload']),
  url: coalesceNull(z.string().url().optional()),
  storageKey: coalesceNull(z.string().min(1).optional()),
  viewingMandatory: z.boolean().default(false),
  order: coalesceNull(z.number().int().min(0).optional()),
});
export type VisitorIntroVideo = z.infer<typeof VisitorIntroVideoSchema>;

export const VisitorIntroSchema = z.object({
  image: coalesceNull(VisitorIntroImageSchema.optional()),
  video: coalesceNull(VisitorIntroVideoSchema.optional()),
  videoByLocale: coalesceNull(
    z
      .object({
        gu: coalesceNull(VisitorIntroVideoSchema.optional()),
        hi: coalesceNull(VisitorIntroVideoSchema.optional()),
      })
      .optional()
  ),
});
export type VisitorIntro = z.infer<typeof VisitorIntroSchema>;

function hasIntroImageContent(image: VisitorIntroImage): boolean {
  if (image.source === 'url') return Boolean(image.url);
  if (image.source === 'upload') return Boolean(image.storageKey);
  return false;
}

function hasIntroVideoContent(video: VisitorIntroVideo): boolean {
  if (video.source === 'youtube' || video.source === 'loom') return Boolean(video.url);
  if (video.source === 'upload') return Boolean(video.storageKey);
  return false;
}

function cleanIntroVideo(raw: unknown): VisitorIntroVideo | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const video = raw as VisitorIntroVideo;
  if (!hasIntroVideoContent(video)) return undefined;
  return video;
}

function cleanIntroImage(raw: unknown): VisitorIntroImage | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const image = raw as VisitorIntroImage;
  if (!hasIntroImageContent(image)) return undefined;
  return image;
}

/** Strip null shells and incomplete intro blocks before API validation. */
export function cleanVisitorIntroInput(intro: unknown): VisitorIntro | null | undefined {
  if (intro === undefined) return undefined;
  if (intro === null) return null;
  if (typeof intro !== 'object') return null;

  const raw = intro as VisitorIntro;
  const out: VisitorIntro = {};
  const image = cleanIntroImage(raw.image);
  if (image) out.image = image;
  const video = cleanIntroVideo(raw.video);
  if (video) out.video = video;

  const gu = cleanIntroVideo(raw.videoByLocale?.gu);
  const hi = cleanIntroVideo(raw.videoByLocale?.hi);
  if (gu || hi) {
    out.videoByLocale = {};
    if (gu) out.videoByLocale.gu = gu;
    if (hi) out.videoByLocale.hi = hi;
  }

  if (!out.image && !out.video && !out.videoByLocale) return null;
  return out;
}

const visitorIntroInputSchema = z.preprocess(
  cleanVisitorIntroInput,
  coalesceNull(VisitorIntroSchema.nullable().optional())
);

export const VisitorFormLocaleContentSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  fields: z.array(VisitorFieldSchema),
});
export type VisitorFormLocaleContent = z.infer<typeof VisitorFormLocaleContentSchema>;

export const VisitorFormTranslationsSchema = z.object({
  gu: VisitorFormLocaleContentSchema.optional(),
  hi: VisitorFormLocaleContentSchema.optional(),
});
export type VisitorFormTranslations = z.infer<typeof VisitorFormTranslationsSchema>;

/** Intro video for a locale (English uses `video`; others use `videoByLocale`). */
export function getIntroVideoForLocale(
  intro: VisitorIntro | null | undefined,
  locale: VisitorFormLocale
): VisitorIntroVideo | undefined {
  if (!intro) return undefined;
  if (locale === 'en') return intro.video;
  return intro.videoByLocale?.[locale];
}

/** Intro block with locale-specific video for public display. */
export function introForLocale(
  intro: VisitorIntro | null | undefined,
  locale: VisitorFormLocale
): VisitorIntro | undefined {
  if (!intro) return undefined;
  const video = getIntroVideoForLocale(intro, locale);
  if (!intro.image && !video) return undefined;
  return { ...intro, video, videoByLocale: undefined };
}

export const VisitorIntroAttestationSchema = z.object({
  videoCompleted: z.literal(true),
  completedAt: z.string().datetime(),
});
export type VisitorIntroAttestation = z.infer<typeof VisitorIntroAttestationSchema>;

function refineVisitorIntro(intro: VisitorIntro | undefined, ctx: z.RefinementCtx, pathPrefix: (string | number)[] = []): void {
  if (!intro) return;
  if (intro.image) {
    if (intro.image.source === 'url') {
      if (!intro.image.url || !isAllowedIntroImageUrl(intro.image.url)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter a valid image URL',
          path: [...pathPrefix, 'image', 'url'],
        });
      }
    } else if (!intro.image.storageKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Upload an image or provide a URL',
        path: [...pathPrefix, 'image', 'storageKey'],
      });
    }
  }
  if (intro.video) {
    refineIntroVideo(intro.video, ctx, [...pathPrefix, 'video']);
  }
  if (intro.videoByLocale?.gu) {
    refineIntroVideo(intro.videoByLocale.gu, ctx, [...pathPrefix, 'videoByLocale', 'gu']);
  }
  if (intro.videoByLocale?.hi) {
    refineIntroVideo(intro.videoByLocale.hi, ctx, [...pathPrefix, 'videoByLocale', 'hi']);
  }
}

function refineIntroVideo(
  video: VisitorIntroVideo,
  ctx: z.RefinementCtx,
  pathPrefix: (string | number)[]
): void {
  if (video.source === 'youtube') {
    if (!video.url || !normalizeYoutubeUrl(video.url)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a valid YouTube URL',
        path: [...pathPrefix, 'url'],
      });
    }
  } else if (video.source === 'loom') {
    if (!video.url || !normalizeLoomUrl(video.url)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a valid Loom share URL',
        path: [...pathPrefix, 'url'],
      });
    }
  } else if (!video.storageKey) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Upload a video file',
      path: [...pathPrefix, 'storageKey'],
    });
  }
}

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
    description: coalesceNull(z.string().max(2000).optional()),
    intro: visitorIntroInputSchema,
    multilingual: VisitorMultilingualSchema.optional(),
    fields: z.array(VisitorFieldSchema).min(1).max(100),
    isActive: z.boolean().default(true),
  })
  .superRefine((val, ctx) => {
    refineVisitorFields(val.fields, ctx);
    if (val.intro) refineVisitorIntro(val.intro, ctx, ['intro']);
  });
export type VisitorFormCreate = z.infer<typeof VisitorFormCreateSchema>;

export const VisitorFormUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: coalesceNull(z.string().max(2000).optional()),
    intro: visitorIntroInputSchema,
    multilingual: VisitorMultilingualSchema.optional(),
    fields: z.array(VisitorFieldSchema).min(1).max(100).optional(),
    isActive: z.boolean().optional(),
    slugStrategy: VisitorSlugStrategySchema.default('keep'),
  })
  .superRefine((val, ctx) => {
    if (val.fields) refineVisitorFields(val.fields, ctx);
    if (val.intro) refineVisitorIntro(val.intro, ctx, ['intro']);
    const keys = ['title', 'description', 'intro', 'multilingual', 'fields', 'isActive', 'slugStrategy'] as const;
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
  introAttestation: VisitorIntroAttestationSchema.optional(),
  locale: VisitorFormLocaleSchema.optional(),
});
export type VisitorPublicSubmit = z.infer<typeof VisitorPublicSubmitSchema>;

/** Returns error message if mandatory intro video attestation is missing. */
export function validateIntroAttestation(
  intro: VisitorIntro | undefined | null,
  attestation: VisitorIntroAttestation | undefined,
  locale: VisitorFormLocale = 'en'
): string | null {
  const video = getIntroVideoForLocale(intro, locale);
  if (!video?.viewingMandatory) return null;
  if (attestation?.videoCompleted === true) return null;
  return 'Please watch the full intro video before submitting.';
}

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
