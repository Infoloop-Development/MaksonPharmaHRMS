import type { VisitorField, VisitorFormLocale, VisitorFormLocaleContent, VisitorFormTranslations } from '@mams/types';
import { visitorExtraLanguages } from '@mams/types';
import type { VisitorMultilingual } from '@mams/types';

const MYMEMORY_LANG: Record<'gu' | 'hi', string> = {
  gu: 'gu-IN',
  hi: 'hi-IN',
};

async function translateText(text: string, target: 'gu' | 'hi'): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;
  try {
    const langpair = `en|${MYMEMORY_LANG[target]}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${langpair}`;
    const res = await fetch(url);
    if (!res.ok) return text;
    const data = (await res.json()) as { responseData?: { translatedText?: string } };
    const out = data.responseData?.translatedText?.trim();
    return out && out.toUpperCase() !== trimmed.toUpperCase() ? out : text;
  } catch {
    return text;
  }
}

async function translateBatch(texts: string[], target: 'gu' | 'hi'): Promise<string[]> {
  const out: string[] = [];
  for (const text of texts) {
    out.push(await translateText(text, target));
    await new Promise((r) => setTimeout(r, 120));
  }
  return out;
}

function collectFieldStrings(fields: VisitorField[]): string[] {
  const strings: string[] = [];
  for (const f of fields) {
    strings.push(f.label);
    if (f.placeholder) strings.push(f.placeholder);
    if (f.helpText) strings.push(f.helpText);
    for (const o of f.options ?? []) strings.push(o);
  }
  return strings;
}

function applyFieldStrings(fields: VisitorField[], translated: string[]): VisitorField[] {
  let i = 0;
  const next = (s?: string) => (s ? translated[i++] ?? s : s);
  return fields.map((f) => ({
    ...f,
    label: next(f.label) ?? f.label,
    placeholder: next(f.placeholder),
    helpText: next(f.helpText),
    options: f.options?.map((o) => next(o) ?? o),
  }));
}

async function translateFields(fields: VisitorField[], target: 'gu' | 'hi'): Promise<VisitorField[]> {
  const strings = collectFieldStrings(fields);
  if (strings.length === 0) return fields;
  const translated = await translateBatch(strings, target);
  return applyFieldStrings(fields, translated);
}

export async function buildVisitorFormTranslations(input: {
  title: string;
  description: string | null;
  fields: VisitorField[];
  multilingual: VisitorMultilingual | null | undefined;
}): Promise<VisitorFormTranslations | null> {
  const extras = visitorExtraLanguages(input.multilingual);
  if (extras.length === 0) return null;

  const translations: VisitorFormTranslations = {};
  const sortedFields = [...input.fields].sort((a, b) => a.order - b.order);

  for (const locale of extras) {
    if (locale !== 'gu' && locale !== 'hi') continue;
    const [title, description] = await translateBatch(
      [input.title, input.description ?? ''],
      locale
    );
    const fields = await translateFields(sortedFields, locale);
    const content: VisitorFormLocaleContent = {
      title: title || input.title,
      description: description || input.description,
      fields,
    };
    translations[locale] = content;
  }

  return translations;
}

export function localeContentForPublic(
  locale: VisitorFormLocale,
  base: { title: string; description: string | null; fields: VisitorField[] },
  translations: VisitorFormTranslations | null | undefined
): VisitorFormLocaleContent {
  if (locale === 'en' || !translations) {
    return { title: base.title, description: base.description, fields: base.fields };
  }
  const localized = translations[locale];
  if (localized) return localized;
  return { title: base.title, description: base.description, fields: base.fields };
}
