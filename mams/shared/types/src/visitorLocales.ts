import { z } from 'zod';

export const VisitorFormLocaleSchema = z.enum(['en', 'gu', 'hi']);
export type VisitorFormLocale = z.infer<typeof VisitorFormLocaleSchema>;

export const VISITOR_FORM_LOCALE_LABELS: Record<VisitorFormLocale, string> = {
  en: 'English',
  gu: 'Gujarati',
  hi: 'Hindi',
};

export const VISITOR_FORM_EXTRA_LOCALES = ['gu', 'hi'] as const satisfies readonly VisitorFormLocale[];

export const VisitorMultilingualSchema = z
  .object({
    enabled: z.boolean().default(false),
    languages: z.array(VisitorFormLocaleSchema).default(['en']),
  })
  .superRefine((val, ctx) => {
    if (!val.languages.includes('en')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'English is required and cannot be removed',
        path: ['languages'],
      });
    }
    const unique = new Set(val.languages);
    if (unique.size !== val.languages.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duplicate languages are not allowed',
        path: ['languages'],
      });
    }
    if (val.enabled) {
      const extras = val.languages.filter((l) => l !== 'en');
      if (extras.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select at least one additional language (Gujarati or Hindi)',
          path: ['languages'],
        });
      }
    }
  });
export type VisitorMultilingual = z.infer<typeof VisitorMultilingualSchema>;

export function normalizeVisitorLanguages(
  multilingual: VisitorMultilingual | undefined | null
): VisitorMultilingual {
  if (!multilingual?.enabled) {
    return { enabled: false, languages: ['en'] };
  }
  const languages = Array.from(new Set<VisitorFormLocale>(['en', ...multilingual.languages]));
  return { enabled: true, languages };
}

export function visitorExtraLanguages(multilingual: VisitorMultilingual | undefined | null): VisitorFormLocale[] {
  const normalized = normalizeVisitorLanguages(multilingual);
  if (!normalized.enabled) return [];
  return normalized.languages.filter((l) => l !== 'en') as VisitorFormLocale[];
}
