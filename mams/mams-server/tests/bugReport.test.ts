import { describe, expect, it } from 'vitest';
import { Binary } from 'bson';
import {
  BugReportCreateBodySchema,
  BugReportListQuerySchema,
  PERMISSIONS_BY_ROLE,
  canManageBugReports,
} from '@mams/types';
import { toScreenshotDataUrl } from '../src/services/bugReporting.service.js';
import {
  validateBugReportVideoMime,
  validateBugReportVideoSize,
  MAX_BUG_REPORT_VIDEO_BYTES,
  normalizeBugReportVideoMime,
} from '../src/services/bugReportMedia.storage.js';
import { ApiError } from '../src/middleware/error.js';

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

describe('bug report video storage validation', () => {
  it('accepts webm and mp4 mime types', () => {
    expect(() => validateBugReportVideoMime('video/webm')).not.toThrow();
    expect(() => validateBugReportVideoMime('video/mp4')).not.toThrow();
  });

  it('accepts browser MediaRecorder mime types with codec suffix', () => {
    expect(() => validateBugReportVideoMime('video/webm;codecs=vp9,opus')).not.toThrow();
    expect(normalizeBugReportVideoMime('video/webm;codecs=vp9,opus')).toBe('video/webm');
  });

  it('infers webm from filename when mime is generic', () => {
    expect(normalizeBugReportVideoMime('application/octet-stream', 'recording.webm')).toBe(
      'video/webm'
    );
  });

  it('rejects unsupported mime types', () => {
    expect(() => validateBugReportVideoMime('video/avi')).toThrow(ApiError);
  });

  it('enforces max video size', () => {
    expect(() => validateBugReportVideoSize(1024)).not.toThrow();
    expect(() => validateBugReportVideoSize(MAX_BUG_REPORT_VIDEO_BYTES + 1)).toThrow(ApiError);
  });
});
