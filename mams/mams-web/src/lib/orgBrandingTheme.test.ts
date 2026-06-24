import { describe, expect, it } from 'vitest';
import {
  brandingCssVars,
  contrastTextOnBackground,
  fontFamilyStack,
  lightenHex,
  linkColorOnDarkSurface,
  linkColorOnSurface,
  relativeLuminance,
  swatchOptions,
} from './orgBrandingTheme';
import { DEFAULT_ORG_BRANDING } from '@mams/types';

describe('relativeLuminance', () => {
  it('returns higher luminance for white than black', () => {
    expect(relativeLuminance('#FFFFFF')).toBeGreaterThan(relativeLuminance('#000000'));
  });
});

describe('contrastTextOnBackground', () => {
  it('uses white text on dark primary', () => {
    expect(contrastTextOnBackground('#1A2878')).toBe('#FFFFFF');
    expect(contrastTextOnBackground(DEFAULT_ORG_BRANDING.primaryColor)).toBe('#FFFFFF');
  });

  it('uses dark text on light primary', () => {
    expect(contrastTextOnBackground('#F5F5F5')).toBe('#1A1F36');
    expect(contrastTextOnBackground('#FFFFFF')).toBe('#1A1F36');
  });
});

describe('linkColorOnSurface', () => {
  it('uses brand primary when dark enough for light backgrounds', () => {
    expect(linkColorOnSurface('#1A2878')).toBe('#1A2878');
  });

  it('falls back to dark text when brand primary is too light', () => {
    expect(linkColorOnSurface('#FFFFFF')).toBe('#1A1F36');
  });
});

describe('linkColorOnDarkSurface', () => {
  it('lightens dark brand primary for dark backgrounds', () => {
    expect(linkColorOnDarkSurface('#1A2878')).not.toBe('#1A2878');
    expect(relativeLuminance(linkColorOnDarkSurface('#1A2878'))).toBeGreaterThan(
      relativeLuminance('#1A2878')
    );
  });
});

describe('lightenHex', () => {
  it('derives a lighter shade from primary', () => {
    const light = lightenHex('#1A2878', 0.15);
    expect(light).toBe('#3C488C');
    expect(relativeLuminance(light)).toBeGreaterThan(relativeLuminance('#1A2878'));
  });
});

describe('fontFamilyStack', () => {
  it('returns quoted font stack with fallbacks', () => {
    expect(fontFamilyStack('Inter')).toBe('"Inter", system-ui, sans-serif');
  });
});

describe('swatchOptions', () => {
  const palette = ['#D85426', '#2758AB', '#228B39'];
  const fallback = ['#1A2878', '#2E3F99', '#E82C2C'];

  it('keeps palette order when selected is already in top 3', () => {
    expect(swatchOptions(palette, '#228B39', fallback)).toEqual(palette);
  });

  it('prepends selected color when not in palette top 3', () => {
    expect(swatchOptions(palette, '#FF00FF', fallback)).toEqual(['#FF00FF', '#D85426', '#2758AB']);
  });
});

describe('brandingCssVars', () => {
  it('includes sidebar text and brand tokens', () => {
    const vars = brandingCssVars(DEFAULT_ORG_BRANDING);
    expect(vars['--color-brand-primary']).toBe('#1A2878');
    expect(vars['--color-brand-primary-light']).toBe('#3C488C');
    expect(vars['--color-brand-secondary']).toBe('#E82C2C');
    expect(vars['--sidebar-text']).toBe('#FFFFFF');
    expect(vars['--color-brand-primary-text']).toBe('#FFFFFF');
    expect(vars['--color-link']).toBe('#1A2878');
    expect(vars['--font-brand-sans']).toContain('DM Sans');
  });

  it('uses readable link color on light surfaces when primary is white', () => {
    const vars = brandingCssVars({ ...DEFAULT_ORG_BRANDING, primaryColor: '#FFFFFF' }, 'light');
    expect(vars['--color-link']).toBe('#1A1F36');
  });

  it('uses dark-theme link color when requested', () => {
    const vars = brandingCssVars(DEFAULT_ORG_BRANDING, 'dark');
    expect(vars['--color-link']).toBe(linkColorOnDarkSurface(DEFAULT_ORG_BRANDING.primaryColor));
  });

  it('uses white primary button text on dark primary', () => {
    const vars = brandingCssVars({ ...DEFAULT_ORG_BRANDING, primaryColor: '#1A2878' });
    expect(vars['--color-brand-primary-text']).toBe('#FFFFFF');
  });

  it('uses dark primary button text on light primary', () => {
    const vars = brandingCssVars({ ...DEFAULT_ORG_BRANDING, primaryColor: '#FFFFFF' });
    expect(vars['--color-brand-primary-text']).toBe('#1A1F36');
  });
});
