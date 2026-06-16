import { describe, expect, it } from 'vitest';
import { buildQrStickerHtml, escapeHtml } from './visitorQr';

describe('visitorQr', () => {
  const branding = {
    companyName: 'Makson Pharma',
    companyLogo: 'data:image/png;base64,abc',
    formTitle: 'Office Visitor Form',
  };

  it('buildQrStickerHtml orders logo|company row then QR then form title', () => {
    const html = buildQrStickerHtml('data:image/png;base64,qr', branding);
    const brandRowIdx = html.indexOf('class="brand-row"');
    const logoIdx = html.indexOf('class="logo"');
    const companyIdx = html.indexOf('class="company-name"');
    const qrIdx = html.indexOf('class="qr"');
    const formIdx = html.indexOf('class="form-title"');

    expect(brandRowIdx).toBeGreaterThan(-1);
    expect(logoIdx).toBeGreaterThan(brandRowIdx);
    expect(companyIdx).toBeGreaterThan(logoIdx);
    expect(qrIdx).toBeGreaterThan(companyIdx);
    expect(formIdx).toBeGreaterThan(qrIdx);
  });

  it('buildQrStickerHtml omits logo when companyLogo is null', () => {
    const html = buildQrStickerHtml('data:image/png;base64,qr', {
      ...branding,
      companyLogo: null,
    });
    expect(html).not.toContain('class="logo"');
    expect(html).toContain('Makson Pharma');
    expect(html).toContain('Office Visitor Form');
  });

  it('buildQrStickerHtml escapes special characters', () => {
    const html = buildQrStickerHtml('data:image/png;base64,qr', {
      companyName: 'A & B <Corp>',
      companyLogo: null,
      formTitle: 'Form "Guest"',
    });
    expect(html).toContain('A &amp; B &lt;Corp&gt;');
    expect(html).toContain('Form &quot;Guest&quot;');
    expect(html).not.toContain('A & B <Corp>');
  });

  it('escapeHtml escapes quotes and angle brackets', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(escapeHtml('Form "Guest"')).toBe('Form &quot;Guest&quot;');
  });
});
