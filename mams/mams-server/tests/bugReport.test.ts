import { describe, expect, it } from 'vitest';
import { Binary } from 'bson';
import {
  BugReportCreateBodySchema,
  BugReportDetectedLanguageSchema,
  BugReportListQuerySchema,
  BugReportTranscriptionStatusSchema,
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
import {
  canStartTranscription,
  isTranscriptionInProgress,
  scoreTranscriptCandidate,
  pickBestTranscript,
  pickBestIndicCandidate,
  sanitizeTranscriptionError,
  shouldReturnCachedTranscription,
} from '../src/services/bugReportTranscription.helpers.js';
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

describe('bug report transcription schemas', () => {
  it('accepts transcription status values', () => {
    expect(BugReportTranscriptionStatusSchema.parse('processing')).toBe('processing');
    expect(BugReportTranscriptionStatusSchema.parse('completed')).toBe('completed');
    expect(BugReportTranscriptionStatusSchema.parse('failed')).toBe('failed');
    expect(() => BugReportTranscriptionStatusSchema.parse('pending')).toThrow();
  });

  it('accepts detected language values', () => {
    expect(BugReportDetectedLanguageSchema.parse('en')).toBe('en');
    expect(BugReportDetectedLanguageSchema.parse('hi')).toBe('hi');
    expect(BugReportDetectedLanguageSchema.parse('gu')).toBe('gu');
    expect(() => BugReportDetectedLanguageSchema.parse('fr')).toThrow();
  });
});

describe('pickBestTranscript', () => {
  it('prefers Hindi when English is long Latin gibberish on Hindi speech', () => {
    const longEn =
      'story and know little did i know good and had access to my cctv cameras and she knew when i arrived at the store all right and trying to figure out what was wrong or just made this club and see was dead and there are some twelve thousand units flying at the store out of twelve';
    const result = pickBestTranscript({
      best: { language: 'en', text: longEn, confidence: 0.72 },
      candidates: [
        { language: 'en', text: longEn, confidence: 0.72 },
        {
          language: 'hi',
          text: 'सोल एक्सेस सीसीटीवी कैमरा राइट हर सकी लाइफ टाइम सेंट्रल फ्लाइंग स्टोर',
          confidence: 0.78,
        },
        { language: 'gu', text: 'ટેસ્ટ ટેક્સ્ટ', confidence: 0.44 },
      ],
    });
    expect(result.language).toBe('hi');
    expect(result.text).toContain('सेंट्रल');
  });

  it('prefers English when Hindi is only a short false-positive snippet', () => {
    const result = pickBestTranscript({
      best: { language: 'hi', text: 'सेंट्रल फ्लाइंग स्टोर कैमरा', confidence: 0.91 },
      candidates: [
        {
          language: 'en',
          text: 'navigate to this tab and see there are twelve thousand units in the store and check the camera feed',
          confidence: 0.88,
        },
        { language: 'hi', text: 'सेंट्रल फ्लाइंग स्टोर कैमरा', confidence: 0.91 },
        { language: 'gu', text: 'ટેસ્ટ', confidence: 0.44 },
      ],
    });
    expect(result.language).toBe('en');
    expect(result.text).toContain('twelve thousand');
  });

  it('prefers English for genuine English speech even if Hindi has a few words', () => {
    const result = pickBestTranscript({
      best: { language: 'hi', text: 'सेंट्रल फ्लाइंग', confidence: 0.97 },
      candidates: [
        {
          language: 'en',
          text: 'navigate to this tab and see there are twelve thousand units in the store',
          confidence: 0.92,
        },
        { language: 'hi', text: 'सेंट्रल फ्लाइंग', confidence: 0.97 },
        { language: 'gu', text: 'ટેસ્ટ', confidence: 0.44 },
      ],
    });
    expect(result.language).toBe('en');
    expect(result.text).toContain('twelve thousand');
  });

  it('rejects empty candidates in favor of any non-empty transcript', () => {
    const result = pickBestTranscript({
      best: { language: 'hi', text: '', confidence: 0.99 },
      candidates: [
        { language: 'en', text: 'hello world', confidence: 0.6 },
        { language: 'hi', text: '', confidence: 0.99 },
      ],
    });
    expect(result.language).toBe('en');
    expect(result.text).toBe('hello world');
  });

  it('breaks ties between equal scores by longer text via word count', () => {
    const result = pickBestTranscript({
      best: { language: 'en', text: 'hi', confidence: 0.5 },
      candidates: [
        { language: 'en', text: 'hi', confidence: 0.5 },
        { language: 'gu', text: 'કેમ છો ભાઈ', confidence: 0.5 },
      ],
    });
    expect(result.language).toBe('gu');
    expect(result.text).toBe('કેમ છો ભાઈ');
  });

  it('prefers Gujarati over Hindi when Gujarati script dominates', () => {
    const result = pickBestIndicCandidate([
      {
        language: 'hi',
        text: 'सेंट्रल फ्लाइंग स्टोर कैमरा एक्सेस',
        confidence: 0.82,
      },
      {
        language: 'gu',
        text: 'આ દુકાનમાં બાર હજાર યુનિટ છે અને સીસીટીવી કેમેરા ચાલુ છે',
        confidence: 0.71,
      },
    ]);
    expect(result.language).toBe('gu');
  });

  it('prefers Gujarati when English is long Latin gibberish on Gujarati speech', () => {
    const longEn =
      'the quick brown fox jumps over the lazy dog and then something else entirely wrong about the store and camera access for twelve thousand units flying around';
    const result = pickBestTranscript({
      best: { language: 'en', text: longEn, confidence: 0.74 },
      candidates: [
        { language: 'en', text: longEn, confidence: 0.74 },
        {
          language: 'gu',
          text: 'આ દુકાનમાં બાર હજાર યુનિટ છે અને સીસીટીવી કેમેરા ચાલુ છે',
          confidence: 0.71,
        },
        { language: 'hi', text: 'टेस्ट', confidence: 0.4 },
      ],
    });
    expect(result.language).toBe('gu');
    expect(result.text).toContain('દુકાન');
  });

  it('falls back to English for unknown language codes', () => {
    const result = pickBestTranscript({
      best: { language: 'xx', text: 'unknown lang', confidence: 0.9 },
      candidates: [{ language: 'xx', text: 'unknown lang', confidence: 0.9 }],
    });
    expect(result.language).toBe('en');
  });
});

describe('transcription state guards', () => {
  it('allows start when status is null or failed', () => {
    expect(canStartTranscription(null)).toBe(true);
    expect(canStartTranscription(undefined)).toBe(true);
    expect(canStartTranscription('failed')).toBe(true);
  });

  it('blocks start when processing or completed', () => {
    expect(canStartTranscription('processing')).toBe(false);
    expect(canStartTranscription('completed')).toBe(false);
  });

  it('returns cached detail only when completed', () => {
    expect(shouldReturnCachedTranscription('completed')).toBe(true);
    expect(shouldReturnCachedTranscription('failed')).toBe(false);
    expect(shouldReturnCachedTranscription(null)).toBe(false);
  });

  it('detects in-progress transcription', () => {
    expect(isTranscriptionInProgress('processing')).toBe(true);
    expect(isTranscriptionInProgress('failed')).toBe(false);
  });

  it('truncates long error messages', () => {
    const long = 'x'.repeat(300);
    const sanitized = sanitizeTranscriptionError(long);
    expect(sanitized.length).toBeLessThanOrEqual(240);
    expect(sanitized.endsWith('…')).toBe(true);
  });
});
