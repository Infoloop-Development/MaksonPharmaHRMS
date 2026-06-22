import { describe, expect, it } from 'vitest';
import { isSvgDataUrl, quantizePixelsToPalette } from './extractLogoPalette';
import type { Rgb } from './orgBrandingTheme';

describe('isSvgDataUrl', () => {
  it('detects svg data urls', () => {
    expect(isSvgDataUrl('data:image/svg+xml;base64,abc')).toBe(true);
    expect(isSvgDataUrl('data:image/png;base64,abc')).toBe(false);
    expect(isSvgDataUrl(null)).toBe(false);
  });
});

describe('quantizePixelsToPalette', () => {
  it('returns dominant non-neutral color for solid fill', () => {
    const red: Rgb = { r: 220, g: 20, b: 30 };
    const pixels = Array.from({ length: 200 }, () => red);
    const palette = quantizePixelsToPalette(pixels, 6);
    expect(palette.length).toBeGreaterThan(0);
    expect(palette[0]).toBe('#DC141E');
  });

  it('filters neutral pixels', () => {
    const white: Rgb = { r: 250, g: 250, b: 250 };
    const pixels = Array.from({ length: 100 }, () => white);
    expect(quantizePixelsToPalette(pixels)).toEqual([]);
  });
});
