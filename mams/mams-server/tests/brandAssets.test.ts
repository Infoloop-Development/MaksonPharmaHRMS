import { describe, expect, it } from 'vitest';
import {
  CompanyLogoSchema,
  FaviconSchema,
  LOGO_MAX_BYTES,
  FAVICON_MAX_BYTES,
  FAVICON_OUTPUT_MAX_PX,
  FAVICON_SOURCE_MAX_BYTES,
  validateBrandDataUrl,
} from '@mams/types';

/** Minimal valid 1x1 PNG data URL (well under size limits). */
const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function oversizedDataUrl(maxBytes: number): string {
  const base64Len = Math.ceil((maxBytes + 1) * 4 / 3);
  return `data:image/png;base64,${'A'.repeat(base64Len)}`;
}

describe('CompanyLogoSchema', () => {
  it('accepts null', () => {
    expect(CompanyLogoSchema.safeParse(null).success).toBe(true);
  });

  it('accepts valid png data url', () => {
    expect(CompanyLogoSchema.safeParse(TINY_PNG).success).toBe(true);
  });

  it('rejects non-data-url string', () => {
    expect(CompanyLogoSchema.safeParse('https://example.com/logo.png').success).toBe(false);
  });

  it('rejects oversize payload', () => {
    expect(CompanyLogoSchema.safeParse(oversizedDataUrl(LOGO_MAX_BYTES)).success).toBe(false);
  });
});

describe('FaviconSchema', () => {
  it('accepts null', () => {
    expect(FaviconSchema.safeParse(null).success).toBe(true);
  });

  it('accepts valid png data url', () => {
    expect(FaviconSchema.safeParse(TINY_PNG).success).toBe(true);
  });

  it('rejects oversize payload', () => {
    expect(FaviconSchema.safeParse(oversizedDataUrl(FAVICON_MAX_BYTES)).success).toBe(false);
  });
});

describe('settingsSectionFromChangedFields brand_assets', () => {
  it('maps logo and favicon to brand_assets section', async () => {
    const { settingsSectionFromChangedFields } = await import('../src/services/activity.service.js');
    expect(settingsSectionFromChangedFields(['companyLogo'])).toBe('brand_assets');
    expect(settingsSectionFromChangedFields(['favicon'])).toBe('brand_assets');
    expect(settingsSectionFromChangedFields(['companyLogo', 'favicon'])).toBe('brand_assets');
  });
});

describe('favicon crop constants', () => {
  it('exports output and source limits', () => {
    expect(FAVICON_OUTPUT_MAX_PX).toBe(512);
    expect(FAVICON_SOURCE_MAX_BYTES).toBe(5 * 1024 * 1024);
  });
});

describe('validateBrandDataUrl', () => {
  it('validates logo kind', () => {
    expect(validateBrandDataUrl(TINY_PNG, 'logo').ok).toBe(true);
  });

  it('validates favicon kind', () => {
    expect(validateBrandDataUrl(TINY_PNG, 'favicon').ok).toBe(true);
  });
});
