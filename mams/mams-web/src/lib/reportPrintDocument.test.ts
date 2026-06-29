import { describe, it, expect } from 'vitest';
import {
  buildReportPrintHtml,
  escapeHtml,
  escapeCssString,
  type ReportPrintOptions,
} from './reportPrintDocument';
import type { CompanyBranding } from './companyBranding';

const branding: CompanyBranding = {
  companyName: 'Makson Pharmaceuticals',
  companyLogo: 'data:image/png;base64,abc123',
  registeredAddress: 'Surendranagar, Gujarat',
  signatoryName: 'Komal Makasana',
  signatoryDesignation: 'CFO & Partner',
  confidentialityNoticeEnabled: true,
  confidentialityNoticeText: 'Confidential <employee> data & PII',
};

const baseOptions: ReportPrintOptions = {
  branding,
  title: 'Daily Attendance Report',
  subtitle: '01/06/2026 to 07/06/2026',
  columns: [
    { key: 'date', label: 'Date', mono: true },
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status' },
  ],
  rows: [
    { date: '02/06/2026', name: 'Rajesh Patel', status: 'Present' },
    { date: '02/06/2026', name: 'Priya Shah', status: 'Absent' },
  ],
};

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>"x"&</script>')).toBe(
      '&lt;script&gt;&quot;x&quot;&amp;&lt;/script&gt;'
    );
  });
});

describe('escapeCssString', () => {
  it('escapes quotes and backslashes for CSS content', () => {
    expect(escapeCssString('Say "hello" \\ world')).toBe('Say \\"hello\\" \\\\ world');
  });
});

describe('buildReportPrintHtml', () => {
  it('includes company name, address, and logo', () => {
    const html = buildReportPrintHtml(baseOptions);
    expect(html).toContain('Makson Pharmaceuticals');
    expect(html).toContain('Surendranagar, Gujarat');
    expect(html).toContain('data:image/png;base64,abc123');
    expect(html).toContain('Daily Attendance Report');
  });

  it('includes table headers and row data', () => {
    const html = buildReportPrintHtml(baseOptions);
    expect(html).toContain('<th>Date</th>');
    expect(html).toContain('Rajesh Patel');
    expect(html).toContain('status-present');
    expect(html).toContain('status-absent');
  });

  it('includes page counter CSS', () => {
    const html = buildReportPrintHtml(baseOptions);
    expect(html).toContain('counter(page)');
    expect(html).toContain('counter(pages)');
  });

  it('includes confidentiality once in fixed footer when enabled', () => {
    const html = buildReportPrintHtml(baseOptions);
    expect(html).toContain('class="footer-confidentiality"');
    expect(html).not.toContain('@bottom-center');
    expect(html).toContain('Confidential &lt;employee&gt; data &amp; PII');
    const matches = html.match(/class="footer-confidentiality"/g);
    expect(matches?.length).toBe(1);
  });

  it('omits confidentiality when disabled', () => {
    const html = buildReportPrintHtml({
      ...baseOptions,
      branding: { ...branding, confidentialityNoticeEnabled: false },
    });
    expect(html).not.toContain('class="footer-confidentiality"');
    expect(html).not.toContain('Confidential &lt;employee&gt;');
  });

  it('includes signatory on last page content', () => {
    const html = buildReportPrintHtml(baseOptions);
    expect(html).toContain('Komal Makasana');
    expect(html).toContain('CFO &amp; Partner');
    expect(html).toContain('signatory-block');
  });

  it('includes fixed letterhead for repeating header', () => {
    const html = buildReportPrintHtml(baseOptions);
    expect(html).toContain('letterhead-fixed');
    expect(html).toContain('position: fixed');
  });
});
