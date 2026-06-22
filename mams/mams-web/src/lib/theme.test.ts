import { describe, expect, it } from 'vitest';
import { resolveTheme } from './theme';

describe('resolveTheme', () => {
  it('returns light for light preference', () => {
    expect(resolveTheme('light')).toBe('light');
  });

  it('returns dark for dark preference', () => {
    expect(resolveTheme('dark')).toBe('dark');
  });

  it('returns a valid resolved theme for system preference', () => {
    const result = resolveTheme('system');
    expect(result === 'light' || result === 'dark').toBe(true);
  });
});
