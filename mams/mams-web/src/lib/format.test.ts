import { describe, expect, it } from 'vitest';
import { EMPTY_CELL, displayOrEmpty, fmtDate } from './format';

describe('displayOrEmpty', () => {
  it('returns N/A for null, undefined, and empty string', () => {
    expect(displayOrEmpty(null)).toBe(EMPTY_CELL);
    expect(displayOrEmpty(undefined)).toBe(EMPTY_CELL);
    expect(displayOrEmpty('')).toBe(EMPTY_CELL);
  });

  it('stringifies other values', () => {
    expect(displayOrEmpty(0)).toBe('0');
    expect(displayOrEmpty('HR')).toBe('HR');
    expect(displayOrEmpty(false)).toBe('false');
  });
});

describe('fmtDate', () => {
  it('formats YYYY-MM-DD without throwing', () => {
    expect(fmtDate('2026-07-30')).toMatch(/2026/);
  });

  it('formats ISO datetimes (visitor submittedAt) without throwing', () => {
    expect(fmtDate('2026-07-30T10:30:00.000Z')).toMatch(/2026/);
  });

  it('returns dash for invalid values', () => {
    expect(fmtDate('not-a-date')).toBe('-');
    expect(fmtDate('')).toBe('-');
    expect(fmtDate(null)).toBe('-');
  });
});
