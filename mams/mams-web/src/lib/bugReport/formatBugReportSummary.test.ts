import { describe, expect, it } from 'vitest';
import { formatBugReportSummary } from './formatBugReportSummary';

const baseReport = {
  id: 'report-123',
  title: 'Save failed',
  description: 'Cannot save employee record after editing fields.',
  severity: 'high' as const,
  status: 'new' as const,
  module: 'Employees',
  route: '/employees',
  createdAt: '2026-06-30T12:00:00.000Z',
  updatedAt: '2026-06-30T12:05:00.000Z',
  reporter: { id: '1', name: 'Test User', email: 't@x.com', role: 'hr.admin' },
  assignee: null,
  screenshotDataUrl: null,
  breadcrumbs: [{ action: 'click:Save', ts: '2026-06-30T11:59:00.000Z' }],
  consoleLog: [{ level: 'error' as const, message: 'API 500', ts: '2026-06-30T11:59:01.000Z' }],
  failedRequests: [{ method: 'POST', path: '/employees', status: 500, ts: '2026-06-30T11:59:01.000Z' }],
  context: {
    route: '/employees',
    module: 'Employees',
    role: 'hr.admin',
    browser: 'Chrome',
    os: 'Windows',
    viewport: '1920x1080',
    sessionDurationMs: 60000,
  },
};

describe('formatBugReportSummary', () => {
  it('includes analysis prompt and all bug evidence', () => {
    const text = formatBugReportSummary(baseReport);

    expect(text).toContain('produce a detailed technical analysis report');
    expect(text).toContain('Report ID:');
    expect(text).toContain('report-123');
    expect(text).toContain('Save failed');
    expect(text).toContain('click:Save');
    expect(text).toContain('[error] API 500');
    expect(text).toContain('POST /employees');
    expect(text).toContain('Cannot save employee');
    expect(text).toContain('Screenshot attached:** No');
    expect(text).toContain('Current assignee:** Unassigned');
    expect(text).toContain('Last updated:');
  });

  it('notes when screenshot is attached', () => {
    const text = formatBugReportSummary({
      ...baseReport,
      screenshotDataUrl: 'data:image/jpeg;base64,abc',
    });
    expect(text).toContain('Screenshot attached:** Yes');
  });

  it('includes assignee details when assigned', () => {
    const text = formatBugReportSummary({
      ...baseReport,
      assignee: { id: 'a1', name: 'IT Admin', email: 'it@example.com' },
    });
    expect(text).toContain('IT Admin (it@example.com)');
    expect(text).toContain('Assignee user ID:** a1');
  });
});
