import { describe, it, expect } from 'vitest';
import { brandingFromSettings } from './companyBranding';
import type { Settings } from '../api/settings';

function settings(partial: Partial<Settings>): Settings {
  return {
    _id: '1',
    companyName: 'Acme Pharma',
    cin: '',
    gstin: '',
    pfRegistrationNumber: '',
    esiRegistrationNumber: '',
    factoryLicenceNumber: '',
    registeredAddress: '123 Main St',
    signatoryName: 'Jane Doe',
    signatoryDesignation: 'Director',
    weeklyOffDefault: [],
    realShifts: [],
    complianceShifts: [],
    smartAnchorEnabled: false,
    smartAnchorVersion: '1',
    confidentialityNoticeEnabled: false,
    confidentialityNoticeText: 'Private',
    timeFormat: '12h',
    companyLogo: 'data:image/png;base64,abc',
    favicon: null,
    ...partial,
  };
}

describe('brandingFromSettings', () => {
  it('maps settings fields', () => {
    const branding = brandingFromSettings(settings({}));
    expect(branding.companyName).toBe('Acme Pharma');
    expect(branding.registeredAddress).toBe('123 Main St');
    expect(branding.signatoryName).toBe('Jane Doe');
    expect(branding.signatoryDesignation).toBe('Director');
    expect(branding.companyLogo).toContain('data:image/png');
    expect(branding.confidentialityNoticeEnabled).toBe(false);
  });

  it('falls back when settings missing', () => {
    const branding = brandingFromSettings(null);
    expect(branding.companyName).toContain('Makson');
    expect(branding.companyLogo).toBeNull();
  });
});
