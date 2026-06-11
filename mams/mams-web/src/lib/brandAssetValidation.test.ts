import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FAVICON_MAX_BYTES, FAVICON_SOURCE_MAX_BYTES } from '@mams/types';
import {
  isFaviconRasterMime,
  validateAndReadFavicon,
  validateFaviconOutput,
  validateFaviconSourceForCrop,
} from './brandAssetValidation';

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function makeFile(type: string, size: number, name = 'favicon'): File {
  const blob = new Blob(['x'], { type });
  const file = new File([blob], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('isFaviconRasterMime', () => {
  it('accepts png and jpeg', () => {
    expect(isFaviconRasterMime('image/png')).toBe(true);
    expect(isFaviconRasterMime('image/jpeg')).toBe(true);
    expect(isFaviconRasterMime('image/jpg')).toBe(true);
  });

  it('rejects svg and ico', () => {
    expect(isFaviconRasterMime('image/svg+xml')).toBe(false);
    expect(isFaviconRasterMime('image/x-icon')).toBe(false);
  });
});

describe('validateFaviconSourceForCrop', () => {
  beforeEach(() => {
    class MockFileReader {
      result: string | ArrayBuffer | null = TINY_PNG;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal('FileReader', MockFileReader);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects non-raster MIME', async () => {
    const result = await validateFaviconSourceForCrop(makeFile('image/svg+xml', 100));
    expect(result).toEqual({
      error: 'Use PNG or JPG for photo crop. SVG and ICO upload without cropping.',
    });
  });

  it('rejects oversize source', async () => {
    const result = await validateFaviconSourceForCrop(
      makeFile('image/png', FAVICON_SOURCE_MAX_BYTES + 1)
    );
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('5 MB');
    }
  });

  it('returns data URL for valid png source', async () => {
    const result = await validateFaviconSourceForCrop(makeFile('image/jpeg', 1024));
    expect(result).toEqual({ dataUrl: TINY_PNG });
  });
});

describe('validateAndReadFavicon', () => {
  beforeEach(() => {
    class MockFileReader {
      result: string | ArrayBuffer | null = TINY_PNG;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal('FileReader', MockFileReader);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects raster MIME for direct upload', async () => {
    const result = await validateAndReadFavicon(makeFile('image/png', 100));
    expect(result).toEqual({
      error: 'Direct upload supports SVG or ICO only. Use PNG/JPG for photo crop.',
    });
  });

  it('rejects oversize svg', async () => {
    const result = await validateAndReadFavicon(
      makeFile('image/svg+xml', FAVICON_MAX_BYTES + 1)
    );
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('500 KB');
    }
  });

  it('accepts svg within size limit', async () => {
    const result = await validateAndReadFavicon(makeFile('image/svg+xml', 512));
    expect(result).toEqual({ dataUrl: TINY_PNG });
  });
});

describe('validateFaviconOutput', () => {
  beforeEach(() => {
    class MockImage {
      width = 64;
      height = 64;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal('Image', MockImage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects non-png data url', async () => {
    const result = await validateFaviconOutput('data:image/jpeg;base64,abc');
    expect(result).toEqual({ error: 'Cropped favicon must be PNG' });
  });

  it('rejects oversize png payload', async () => {
    const base64Len = Math.ceil((FAVICON_MAX_BYTES + 1) * 4) / 3;
    const huge = `data:image/png;base64,${'A'.repeat(base64Len)}`;
    const result = await validateFaviconOutput(huge);
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('500 KB');
    }
  });

  it('accepts valid square png output', async () => {
    const result = await validateFaviconOutput(TINY_PNG);
    expect(result).toEqual({ dataUrl: TINY_PNG });
  });
});
