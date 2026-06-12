import { describe, it, expect } from 'vitest';
import {
  buildAuthorizedByLine,
  buildCsvFooter,
  buildCsvPreamble,
  buildXlsxHeaderRows,
} from '../src/services/exportBranding.service.js';

const branding = {
  companyName: 'Makson Pharmaceuticals',
  registeredAddress: 'Surendranagar, Gujarat',
  signatoryName: 'Komal Makasana',
  signatoryDesignation: 'CFO & Partner',
  confidentialityNoticeEnabled: true,
  confidentialityNoticeText: 'Confidential employee data',
};

describe('buildCsvPreamble', () => {
  it('includes company, address, report meta, and authorized by', () => {
    const lines = buildCsvPreamble(branding, {
      reportType: 'Daily Attendance Report',
      dateRange: '01/06/2026 to 07/06/2026',
    });
    expect(lines[0]).toBe('Company,Makson Pharmaceuticals');
    expect(lines[1]).toBe('Address,"Surendranagar, Gujarat"');
    expect(lines.some((l) => l.startsWith('Report Type,'))).toBe(true);
    expect(lines.some((l) => l.startsWith('Date Range,'))).toBe(true);
    expect(lines.some((l) => l.startsWith('Authorized By,Komal Makasana (CFO & Partner)'))).toBe(true);
  });
});

describe('buildAuthorizedByLine', () => {
  it('returns null when signatory missing', () => {
    expect(buildAuthorizedByLine({ ...branding, signatoryName: '' })).toBeNull();
  });
});

describe('buildCsvFooter', () => {
  it('returns confidentiality line when enabled', () => {
    expect(buildCsvFooter(branding)).toEqual(['"Confidential employee data"']);
  });

  it('returns empty when disabled', () => {
    expect(buildCsvFooter({ ...branding, confidentialityNoticeEnabled: false })).toEqual([]);
  });
});

describe('buildXlsxHeaderRows', () => {
  it('returns key-value rows for spreadsheet header', () => {
    const rows = buildXlsxHeaderRows(branding, {
      reportType: 'Monthly Summary',
      period: '2026-06',
    });
    expect(rows[0]).toEqual(['Company', 'Makson Pharmaceuticals']);
    expect(rows.some((r) => r[0] === 'Period' && r[1] === '2026-06')).toBe(true);
  });
});
