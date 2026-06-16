import { describe, expect, it } from 'vitest';
import {
  normalizeLoomUrl,
  normalizeYoutubeUrl,
  parseLoomVideoId,
  parseYoutubeVideoId,
  validateIntroAttestation,
} from '@mams/types';

describe('visitorIntroMedia', () => {
  it('parses YouTube watch URLs', () => {
    expect(parseYoutubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(normalizeYoutubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    );
  });

  it('parses YouTube shorts URLs', () => {
    expect(parseYoutubeVideoId('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('rejects invalid YouTube URLs', () => {
    expect(parseYoutubeVideoId('https://example.com/watch?v=abc')).toBeNull();
    expect(normalizeYoutubeUrl('not-a-url')).toBeNull();
  });

  it('parses Loom share URLs', () => {
    const id = 'a1b2c3d4e5f6';
    expect(parseLoomVideoId(`https://www.loom.com/share/${id}`)).toBe(id);
    expect(normalizeLoomUrl(`https://loom.com/share/${id}?sid=xyz`)).toBe(
      `https://www.loom.com/share/${id}`
    );
  });

  it('rejects invalid Loom URLs', () => {
    expect(parseLoomVideoId('https://youtube.com/watch?v=abc')).toBeNull();
  });
});

describe('validateIntroAttestation', () => {
  const mandatoryIntro = {
    video: { source: 'youtube' as const, url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', viewingMandatory: true },
  };

  it('requires attestation when viewing is mandatory', () => {
    expect(validateIntroAttestation(mandatoryIntro, undefined)).toMatch(/watch the full intro video/i);
  });

  it('accepts attestation when viewing is mandatory', () => {
    expect(
      validateIntroAttestation(mandatoryIntro, {
        videoCompleted: true,
        completedAt: new Date().toISOString(),
      })
    ).toBeNull();
  });

  it('skips attestation when viewing is not mandatory', () => {
    expect(
      validateIntroAttestation(
        { video: { source: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', viewingMandatory: false } },
        undefined
      )
    ).toBeNull();
  });
});
