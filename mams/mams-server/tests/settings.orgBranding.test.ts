import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ORG_BRANDING,
  OrgBrandingSchema,
  normalizeOrgBranding,
} from '@mams/types';

describe('OrgBrandingSchema', () => {
  it('accepts valid branding payload', () => {
    const parsed = OrgBrandingSchema.safeParse({
      primaryColor: '#1A2878',
      secondaryColor: '#E82C2C',
      fontFamily: 'DM Sans',
      logoPalette: ['#1A2878', '#2E3F99', '#E82C2C'],
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts newly added font families such as Montserrat', () => {
    const parsed = OrgBrandingSchema.safeParse({
      ...DEFAULT_ORG_BRANDING,
      fontFamily: 'Montserrat',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.fontFamily).toBe('Montserrat');
  });

  it('rejects invalid hex colors', () => {
    const parsed = OrgBrandingSchema.safeParse({
      ...DEFAULT_ORG_BRANDING,
      primaryColor: 'blue',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects unknown font families', () => {
    const parsed = OrgBrandingSchema.safeParse({
      ...DEFAULT_ORG_BRANDING,
      fontFamily: 'Comic Sans MS',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('normalizeOrgBranding', () => {
  it('returns defaults when input is empty', () => {
    expect(normalizeOrgBranding(undefined)).toEqual(DEFAULT_ORG_BRANDING);
    expect(normalizeOrgBranding(null)).toEqual(DEFAULT_ORG_BRANDING);
  });

  it('merges partial values with defaults', () => {
    expect(normalizeOrgBranding({ primaryColor: '#112233' }).primaryColor).toBe('#112233');
    expect(normalizeOrgBranding({ primaryColor: '#112233' }).secondaryColor).toBe(
      DEFAULT_ORG_BRANDING.secondaryColor
    );
  });
});

describe('settings orgBranding PATCH auth rules', () => {
  const ORG_SETTINGS_FIELDS = new Set([
    'companyName',
    'orgBranding',
    'companyLogo',
    'favicon',
  ]);

  function canPatchOrgSettings(permissions: string[], changedKeys: string[]): boolean {
    const touchesOrgSettings = changedKeys.some((k) => ORG_SETTINGS_FIELDS.has(k));
    const canOrgSettings =
      permissions.includes('manage.org_settings') || permissions.includes('manage.settings');
    return !touchesOrgSettings || canOrgSettings;
  }

  it('allows orgBranding patch with manage.org_settings', () => {
    expect(canPatchOrgSettings(['manage.org_settings'], ['orgBranding'])).toBe(true);
  });

  it('rejects orgBranding patch without manage.org_settings', () => {
    expect(canPatchOrgSettings(['read.real'], ['orgBranding'])).toBe(false);
  });
});

describe('settingsSectionFromChangedFields brand_assets', () => {
  it('maps orgBranding to brand_assets section', async () => {
    const { settingsSectionFromChangedFields } = await import('../src/services/activity.service.js');
    expect(settingsSectionFromChangedFields(['orgBranding'])).toBe('brand_assets');
  });
});
