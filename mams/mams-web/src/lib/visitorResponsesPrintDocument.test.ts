import { describe, expect, it } from 'vitest';
import type { VisitorField } from '@mams/types';
import type { VisitorRequestListItem } from '../api/visitors';
import type { CompanyBranding } from './companyBranding';
import { buildReportPrintHtml } from './reportPrintDocument';
import {
  buildVisitorResponseFieldColumns,
  buildVisitorResponsePrintRows,
  buildVisitorResponsesFilterSubtitle,
} from './visitorResponsesPrintDocument';

const fields: VisitorField[] = [
  { id: 'name', type: 'short_text', label: 'Full name', required: true, order: 0 },
  { id: 'email', type: 'email', label: 'Email', required: true, order: 1 },
];

const sampleItem: VisitorRequestListItem = {
  _id: 'req1',
  formId: 'form1',
  formVersion: 1,
  publicSlug: 'slug',
  formTitle: 'Sample',
  fieldsSnapshot: fields,
  responses: { name: 'Jane Doe', email: 'jane@example.com' },
  fileAttachments: [],
  status: 'Pending',
  submittedAt: '2026-06-02T10:30:00.000Z',
  decidedBy: null,
  decidedAt: null,
  approverNote: null,
  visitValidUntil: null,
  visitAccessMode: null,
  visitDurationHours: null,
};

const branding: CompanyBranding = {
  companyName: 'Makson Pharmaceuticals',
  companyLogo: null,
  registeredAddress: 'Surendranagar, Gujarat',
  signatoryName: '',
  signatoryDesignation: '',
  confidentialityNoticeEnabled: false,
  confidentialityNoticeText: '',
};

describe('buildVisitorResponseFieldColumns', () => {
  it('maps form fields to print columns in order', () => {
    expect(buildVisitorResponseFieldColumns(fields)).toEqual([
      { key: 'name', label: 'Full name' },
      { key: 'email', label: 'Email' },
    ]);
  });
});

describe('buildVisitorResponsePrintRows', () => {
  it('builds submitted, status, and field values', () => {
    const rows = buildVisitorResponsePrintRows([sampleItem], fields);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe('Pending');
    expect(rows[0]!.name).toBe('Jane Doe');
    expect(rows[0]!.email).toBe('jane@example.com');
    expect(String(rows[0]!.submitted)).toMatch(/2026/);
  });

  it('shows file attachment filename for file fields', () => {
    const fileFields: VisitorField[] = [
      { id: 'doc', type: 'file', label: 'ID proof', required: false, order: 0 },
    ];
    const item: VisitorRequestListItem = {
      ...sampleItem,
      fieldsSnapshot: fileFields,
      responses: { doc: null },
      fileAttachments: [
        { fieldId: 'doc', filename: 'passport.pdf', mimeType: 'application/pdf', size: 100, storageKey: 'k1' },
      ],
    };
    const rows = buildVisitorResponsePrintRows([item], fileFields);
    expect(rows[0]!.doc).toBe('passport.pdf');
  });
});

describe('buildVisitorResponsesFilterSubtitle', () => {
  it('joins active filter parts', () => {
    expect(
      buildVisitorResponsesFilterSubtitle({
        startDate: '2026-06-01',
        endDate: '2026-06-07',
        status: 'Approved',
      })
    ).toBe('From 2026-06-01 · To 2026-06-07 · Status: Approved');
  });
});

describe('openVisitorResponsesPrintWindow', () => {
  it('produces branded HTML with form title and response data', () => {
    const rows = buildVisitorResponsePrintRows([sampleItem], fields);
    const columns = [
      { key: 'submitted', label: 'Submitted' },
      { key: 'status', label: 'Status' },
      ...buildVisitorResponseFieldColumns(fields),
    ];
    const html = buildReportPrintHtml({
      branding,
      title: 'Sample — Responses',
      columns,
      rows,
    });
    expect(html).toContain('Makson Pharmaceuticals');
    expect(html).toContain('Jane Doe');
    expect(html).toContain('jane@example.com');
  });
});
