import { describe, expect, it } from 'vitest';
import { buildPublicUrl, generatePublicSlug } from '../src/services/visitor/visitorForm.service.js';

describe('visitorForm.service', () => {
  it('generatePublicSlug returns 12-char string', () => {
    const slug = generatePublicSlug();
    expect(slug).toHaveLength(12);
    expect(slug).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('buildPublicUrl combines base and slug', () => {
    const url = buildPublicUrl('abc123xyz');
    expect(url).toMatch(/\/visit\/abc123xyz$/);
  });
});
