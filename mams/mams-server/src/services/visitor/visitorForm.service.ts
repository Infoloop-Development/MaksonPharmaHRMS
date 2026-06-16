import { randomBytes } from 'node:crypto';
import type { VisitorField, VisitorFormLocale, VisitorFormTranslations } from '@mams/types';
import {
  introForLocale,
  normalizeVisitorLanguages,
  type VisitorMultilingual,
} from '@mams/types';
import { env } from '../../config/env.js';
import { SettingsModel } from '../../models/Settings.js';
import { VisitorFormModel, type VisitorFormDoc } from '../../models/VisitorForm.js';
import { serializeIntroForPublic, plainIntro } from './visitorIntroMedia.service.js';
import { localeContentForPublic } from './visitorTranslate.service.js';

const DEFAULT_COMPANY_NAME = 'Makson Pharmaceuticals (India) Pvt. Ltd.';
const DEFAULT_ADDRESS =
  '195, Rajkot Highway, Surendranagar, Wadhwancity, Gujarat 363020';

export type PublicVisitorFormBranding = {
  companyName: string;
  companyLogo: string | null;
  registeredAddress: string;
};

export async function getPublicVisitorFormBranding(): Promise<PublicVisitorFormBranding> {
  const doc = await SettingsModel.findOne().lean();
  return {
    companyName: doc?.companyName?.trim() || DEFAULT_COMPANY_NAME,
    companyLogo: doc?.companyLogo ?? null,
    registeredAddress: doc?.registeredAddress?.trim() || DEFAULT_ADDRESS,
  };
}

export function generatePublicSlug(): string {
  return randomBytes(9).toString('base64url').slice(0, 12);
}

export function buildPublicUrl(slug: string): string {
  const base = env.PUBLIC_APP_URL.replace(/\/$/, '');
  return `${base}/visit/${slug}`;
}

export async function findFormBySlug(slug: string): Promise<
  | { kind: 'active'; form: VisitorFormDoc }
  | { kind: 'retired' }
  | { kind: 'not_found' }
> {
  const active = await VisitorFormModel.findOne({ publicSlug: slug, isArchived: false });
  if (active) return { kind: 'active', form: active };

  const retired = await VisitorFormModel.findOne({
    isArchived: false,
    'retiredSlugs.slug': slug,
  });
  if (retired) return { kind: 'retired' };

  return { kind: 'not_found' };
}

function mapPublicFields(fields: VisitorField[]) {
  return [...fields]
    .sort((a, b) => a.order - b.order)
    .map((f) => ({
      id: f.id,
      type: f.type,
      label: f.label,
      placeholder: f.placeholder ?? undefined,
      helpText: f.helpText ?? undefined,
      required: f.required,
      options: f.options ?? undefined,
      order: f.order,
      maxFileBytes: f.maxFileBytes ?? undefined,
    }));
}

function buildLocalePayload(
  form: VisitorFormDoc,
  locale: VisitorFormLocale,
  introSerialized: ReturnType<typeof serializeIntroForPublic>
) {
  const translations = form.translations as VisitorFormTranslations | null | undefined;
  const baseFields = form.fields as VisitorField[];
  const content = localeContentForPublic(
    locale,
    { title: form.title, description: form.description ?? null, fields: baseFields },
    translations
  );
  const intro = introForLocale(introSerialized ?? null, locale);
  return {
    title: content.title,
    description: content.description,
    fields: mapPublicFields(content.fields),
    intro,
  };
}

export async function serializeFormForPublic(form: VisitorFormDoc) {
  const introRaw = plainIntro(form.intro as Parameters<typeof plainIntro>[0]);
  const introSerialized = serializeIntroForPublic(introRaw, form.publicSlug);
  const multilingual = normalizeVisitorLanguages(
    form.multilingual as VisitorMultilingual | null | undefined
  );

  const languages = multilingual.enabled ? multilingual.languages : (['en'] as VisitorFormLocale[]);
  const localeContent: Record<string, ReturnType<typeof buildLocalePayload>> = {};

  for (const locale of languages) {
    localeContent[locale] = buildLocalePayload(form, locale, introSerialized);
  }

  const defaultEn = localeContent.en ?? buildLocalePayload(form, 'en', introSerialized);
  const branding = await getPublicVisitorFormBranding();

  return {
    title: defaultEn.title,
    description: defaultEn.description,
    formVersion: form.formVersion,
    isActive: form.isActive,
    intro: defaultEn.intro,
    introFull: introSerialized,
    fields: defaultEn.fields,
    multilingual: {
      enabled: multilingual.enabled,
      languages,
    },
    localeContent,
    branding,
  };
}

export function enrichFormResponse(form: VisitorFormDoc, submissionCount = 0) {
  return {
    _id: String(form._id),
    title: form.title,
    description: form.description,
    intro: plainIntro(form.intro as Parameters<typeof plainIntro>[0]),
    multilingual: normalizeVisitorLanguages(form.multilingual as VisitorMultilingual | null | undefined),
    translations: form.translations ?? null,
    publicSlug: form.publicSlug,
    publicUrl: buildPublicUrl(form.publicSlug),
    formVersion: form.formVersion,
    fields: form.fields,
    isActive: form.isActive,
    isArchived: form.isArchived,
    submissionCount,
    createdBy: form.createdBy,
    updatedBy: form.updatedBy,
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
  };
}
