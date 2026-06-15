import { describe, expect, it } from 'vitest';
import { validateVisitorResponses, VisitorFormUpdateSchema, getIntroVideoForLocale, type VisitorField } from '@mams/types';

const baseFields: VisitorField[] = [
  { id: 'name', type: 'short_text', label: 'Name', required: true, order: 0 },
  { id: 'email', type: 'email', label: 'Email', required: true, order: 1 },
  { id: 'photo', type: 'file', label: 'Photo', required: false, order: 2 },
];

describe('validateVisitorResponses', () => {
  it('requires required text fields', () => {
    const r = validateVisitorResponses(baseFields, { name: '', email: 'a@b.com' }, new Set());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.name).toBeTruthy();
  });

  it('validates email format', () => {
    const r = validateVisitorResponses(baseFields, { name: 'Jane', email: 'not-email' }, new Set());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.email).toBeTruthy();
  });

  it('accepts file via fileFieldIds for required file', () => {
    const fields: VisitorField[] = [{ id: 'id', type: 'file', label: 'ID', required: true, order: 0 }];
    const r = validateVisitorResponses(fields, {}, new Set(['id']));
    expect(r.ok).toBe(true);
  });

  it('passes valid submission', () => {
    const r = validateVisitorResponses(
      baseFields,
      { name: 'Jane Doe', email: 'jane@example.com' },
      new Set()
    );
    expect(r.ok).toBe(true);
  });
});

describe('VisitorFormUpdateSchema', () => {
  it('accepts mongoose null optional fields on intro and fields', () => {
    const parsed = VisitorFormUpdateSchema.parse({
      title: 'Visitor form',
      fields: [
        {
          id: 'name',
          type: 'short_text',
          label: 'Name',
          required: true,
          order: 0,
          placeholder: null,
          helpText: null,
          maxFileBytes: null,
        },
      ],
      intro: {
        image: null,
        video: { source: 'upload', storageKey: null, viewingMandatory: false },
        videoByLocale: {
          gu: { source: 'upload', storageKey: 'gu-key', viewingMandatory: false },
          hi: null,
        },
      },
    });
    expect(parsed.fields?.[0]?.placeholder).toBeUndefined();
    expect(parsed.intro?.video).toBeUndefined();
    expect(parsed.intro?.videoByLocale?.gu?.storageKey).toBe('gu-key');
    expect(parsed.intro?.videoByLocale?.hi).toBeUndefined();
  });
});

describe('getIntroVideoForLocale', () => {
  const enVideo = { source: 'upload' as const, storageKey: 'en-vid', viewingMandatory: false };
  const guVideo = { source: 'upload' as const, storageKey: 'gu-vid', viewingMandatory: false };

  it('returns English video only on en tab', () => {
    const intro = { video: enVideo, videoByLocale: { gu: guVideo } };
    expect(getIntroVideoForLocale(intro, 'en')?.storageKey).toBe('en-vid');
  });

  it('returns gu video on gu tab when gu upload exists', () => {
    const intro = { video: enVideo, videoByLocale: { gu: guVideo } };
    expect(getIntroVideoForLocale(intro, 'gu')?.storageKey).toBe('gu-vid');
  });

  it('does not fall back to English on gu tab when only en video exists', () => {
    const intro = { video: enVideo };
    expect(getIntroVideoForLocale(intro, 'gu')).toBeUndefined();
  });

  it('returns undefined on en tab when only gu video exists', () => {
    const intro = { videoByLocale: { gu: guVideo } };
    expect(getIntroVideoForLocale(intro, 'en')).toBeUndefined();
  });
});
