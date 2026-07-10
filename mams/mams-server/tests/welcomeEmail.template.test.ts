import { describe, it, expect } from 'vitest';
import { DEFAULT_ORG_BRANDING } from '@mams/types';
import {
  buildWelcomeEmailBodies,
  buildWelcomeEmailSubject,
  escapeHtml,
} from '../src/services/welcomeEmail.template.js';
import type { PublicOrgBranding } from '../src/services/publicOrgBranding.service.js';

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function branding(overrides: Partial<PublicOrgBranding> = {}): PublicOrgBranding {
  return {
    companyName: 'Acme Corp',
    companyLogo: TINY_PNG,
    favicon: null,
    orgBranding: { ...DEFAULT_ORG_BRANDING, primaryColor: '#1A2878', secondaryColor: '#E82C2C' },
    ...overrides,
  };
}

const baseParams = {
  name: 'Jane Doe',
  role: 'hr.admin' as const,
  email: 'jane@acme.com',
  password: 'TempPass123!',
  loginUrl: 'https://mams.acme.com/login',
};

describe('welcomeEmail.template', () => {
  it('escapeHtml encodes special characters', () => {
    expect(escapeHtml('<script>&"')).toBe('&lt;script&gt;&amp;&quot;');
  });

  it('buildWelcomeEmailSubject includes company name', () => {
    expect(buildWelcomeEmailSubject(branding())).toContain('Acme Corp');
    expect(buildWelcomeEmailSubject(branding())).toMatch(/sign in/i);
  });

  it('includes logo, brand colors, company name, and mobile styles when logo is set', () => {
    const { html, text } = buildWelcomeEmailBodies({
      ...baseParams,
      branding: branding(),
    });

    expect(html).toContain(TINY_PNG);
    expect(html).toContain('Acme Corp');
    expect(html).toContain('#1A2878');
    expect(html).toContain('#E82C2C');
    expect(html).toContain('jane@acme.com');
    expect(html).toContain('TempPass123!');
    expect(html).toContain('https://mams.acme.com/login');
    expect(html).toContain('Sign in to MAMS');
    expect(html).toContain('HR Admin');
    expect(html).toContain('@media only screen and (max-width: 600px)');
    expect(html).toContain('viewport');
    expect(text).toContain('Jane Doe');
    expect(text).toMatch(/change your password/i);
  });

  it('renders initial-letter badge when companyLogo is null', () => {
    const { html } = buildWelcomeEmailBodies({
      ...baseParams,
      branding: branding({ companyLogo: null, companyName: 'Beta Ltd' }),
    });

    expect(html).not.toContain('<img');
    expect(html).toContain('>B<');
    expect(html).toContain('Beta Ltd');
  });
});
