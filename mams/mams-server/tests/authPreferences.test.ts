import { describe, it, expect } from 'vitest';
import { ThemePreferenceSchema, UpdatePreferencesRequestSchema, UserPublicSchema } from '@mams/types';

describe('ThemePreferenceSchema', () => {
  it('accepts light, dark, and system', () => {
    expect(ThemePreferenceSchema.parse('light')).toBe('light');
    expect(ThemePreferenceSchema.parse('dark')).toBe('dark');
    expect(ThemePreferenceSchema.parse('system')).toBe('system');
  });

  it('rejects invalid values', () => {
    expect(() => ThemePreferenceSchema.parse('auto')).toThrow();
  });
});

describe('UpdatePreferencesRequestSchema', () => {
  it('accepts themePreference', () => {
    expect(UpdatePreferencesRequestSchema.parse({ themePreference: 'dark' })).toEqual({ themePreference: 'dark' });
  });

  it('rejects empty body', () => {
    expect(() => UpdatePreferencesRequestSchema.parse({})).toThrow();
  });
});

describe('UserPublicSchema', () => {
  it('defaults themePreference to system', () => {
    const parsed = UserPublicSchema.parse({
      id: '1',
      email: 'hr.admin@makson-group.com',
      name: 'Test',
      role: 'hr.admin',
      viewMode: 'real',
      permissions: ['read.real'],
      isActive: true,
      mustChangePassword: false,
      lastLoginAt: null,
    });
    expect(parsed.themePreference).toBe('system');
  });
});
