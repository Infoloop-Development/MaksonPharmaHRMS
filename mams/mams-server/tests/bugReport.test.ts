import { describe, expect, it } from 'vitest';
import { Binary } from 'bson';
import {
  BugReportCreateBodySchema,
  BugReportListQuerySchema,
  PERMISSIONS_BY_ROLE,
  canManageBugReports,
} from '@mams/types';
import { toScreenshotDataUrl } from '../src/services/bugReporting.service.js';

describe('BugReportCreateBodySchema', () => {
  it('accepts a minimal valid payload', () => {
    const parsed = BugReportCreateBodySchema.parse({
      title: 'Button does not work',
      description: 'When I click save nothing happens on the employees page.',
      severity: 'high',
      consoleLog: [],
      breadcrumbs: [{ action: 'route:/employees', ts: new Date().toISOString() }],
      failedRequests: [],
      context: {
        route: '/employees',
        module: 'Employees',
        role: 'hr.admin',
        browser: 'Chrome',
        os: 'Windows',
        viewport: '1920x1080',
        sessionDurationMs: 1000,
      },
    });
    expect(parsed.severity).toBe('high');
  });
});

describe('BugReportListQuerySchema', () => {
  it('defaults pagination', () => {
    const q = BugReportListQuerySchema.parse({});
    expect(q.page).toBe(1);
    expect(q.sortBy).toBe('createdAt');
  });
});

describe('canManageBugReports RBAC', () => {
  it('it.admin includes manage.bug_reports', () => {
    expect(PERMISSIONS_BY_ROLE['it.admin']).toContain('manage.bug_reports');
    expect(canManageBugReports(PERMISSIONS_BY_ROLE['it.admin'])).toBe(true);
  });

  it('org.admin does not include manage.bug_reports by default', () => {
    expect(PERMISSIONS_BY_ROLE['org.admin']).not.toContain('manage.bug_reports');
    expect(canManageBugReports(PERMISSIONS_BY_ROLE['org.admin'])).toBe(false);
  });
});

describe('toScreenshotDataUrl', () => {
  it('encodes Buffer screenshot data', () => {
    const buf = Buffer.from('jpeg-bytes');
    const url = toScreenshotDataUrl('image/jpeg', buf);
    expect(url).toBe(`data:image/jpeg;base64,${buf.toString('base64')}`);
  });

  it('encodes MongoDB Binary screenshot data', () => {
    const buf = Buffer.from('mongo-binary');
    const binary = new Binary(buf);
    const url = toScreenshotDataUrl('image/jpeg', binary);
    expect(url).toBe(`data:image/jpeg;base64,${buf.toString('base64')}`);
  });

  it('returns null when data is missing', () => {
    expect(toScreenshotDataUrl('image/jpeg', null)).toBeNull();
    expect(toScreenshotDataUrl(null, Buffer.from('x'))).toBeNull();
  });
});
