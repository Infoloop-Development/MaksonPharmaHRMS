import { describe, expect, it } from 'vitest';
import { EMPTY_CELL, displayOrEmpty } from './format';

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
