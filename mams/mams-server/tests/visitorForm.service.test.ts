import { describe, expect, it } from 'vitest';
import { getIntroVideoForLocale } from '@mams/types';
import { buildPublicUrl, generatePublicSlug } from '../src/services/visitor/visitorForm.service.js';
import {
  serializeIntroForPublic,
  introUsesStorageKey,
} from '../src/services/visitor/visitorIntroMedia.service.js';

describe('visitorForm.service', () => {
  it('generatePublicSlug returns 12-char string', () => {
    const slug = generatePublicSlug();
    expect(slug).toHaveLength(12);
    expect(slug).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('buildPublicUrl combines base and slug', () => {
    const url = buildPublicUrl('abc123xyz');
    expect(url).toMatch(/\/visit\/abc123xyz$/);
  });
});

describe('serializeIntroForPublic', () => {
  it('rewrites upload storage keys to public media URLs', () => {
    const intro = serializeIntroForPublic(
      {
        image: { source: 'upload', storageKey: 'img-key' },
        video: { source: 'upload', storageKey: 'vid-key', viewingMandatory: true },
      },
      'my-slug'
    );
    expect(intro?.image?.url).toContain('/api/public/visitor-forms/my-slug/intro-media/img-key');
    expect(intro?.video?.url).toContain('/api/public/visitor-forms/my-slug/intro-media/vid-key');
  });

  it('introUsesStorageKey matches intro refs', () => {
    const intro = { image: { source: 'upload' as const, storageKey: 'abc' } };
    expect(introUsesStorageKey(intro, 'abc')).toBe(true);
    expect(introUsesStorageKey(intro, 'other')).toBe(false);
  });

  it('resolves per-locale upload URLs strictly without cross-locale fallback', () => {
    const introFull = serializeIntroForPublic(
      {
        video: { source: 'upload', storageKey: 'en-key', viewingMandatory: false },
        videoByLocale: {
          gu: { source: 'upload', storageKey: 'gu-key', viewingMandatory: false },
        },
      },
      'form-slug'
    );
    expect(introFull?.video?.url).toContain('en-key');
    expect(introFull?.videoByLocale?.gu?.url).toContain('gu-key');
    expect(getIntroVideoForLocale(introFull, 'en')?.url).toContain('en-key');
    expect(getIntroVideoForLocale(introFull, 'gu')?.url).toContain('gu-key');
    expect(getIntroVideoForLocale(introFull, 'hi')).toBeUndefined();
    expect(getIntroVideoForLocale(introFull, 'gu')?.url).not.toContain('en-key');
  });
});
