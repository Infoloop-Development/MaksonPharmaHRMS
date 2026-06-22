import { describe, expect, it, beforeEach, vi } from 'vitest';
import { DEFAULT_ORG_BRANDING } from '@mams/types';
import {
  ORG_BRANDING_STORAGE_KEY,
  applyCachedBrandingToDocument,
  cacheOrgBranding,
  readCachedOrgBranding,
} from './orgBrandingCache';
import { brandingCssVars } from './orgBrandingTheme';

const SAMPLE = {
  ...DEFAULT_ORG_BRANDING,
  primaryColor: '#228B39',
  secondaryColor: '#D85426',
};

function createMockLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    clear: () => store.clear(),
  };
}

function createMockDocument() {
  const vars = new Map<string, string>();
  return {
    documentElement: {
      style: {
        cssText: '',
        setProperty: (key: string, value: string) => vars.set(key, value),
        getPropertyValue: (key: string) => vars.get(key) ?? '',
      },
    },
    vars,
  };
}

describe('orgBrandingCache', () => {
  let mockStorage: ReturnType<typeof createMockLocalStorage>;
  let mockDoc: ReturnType<typeof createMockDocument>;

  beforeEach(() => {
    mockStorage = createMockLocalStorage();
    mockDoc = createMockDocument();
    vi.stubGlobal('localStorage', mockStorage);
    vi.stubGlobal('document', mockDoc);
  });

  it('round-trips branding through localStorage', () => {
    cacheOrgBranding(SAMPLE);
    expect(readCachedOrgBranding()).toEqual({
      ...SAMPLE,
      primaryColor: '#228B39',
      secondaryColor: '#D85426',
    });
  });

  it('returns null for corrupt cache', () => {
    mockStorage.setItem(ORG_BRANDING_STORAGE_KEY, '{not json');
    expect(readCachedOrgBranding()).toBeNull();
  });

  it('returns null for invalid payload shape', () => {
    mockStorage.setItem(ORG_BRANDING_STORAGE_KEY, JSON.stringify({ v: 1 }));
    expect(readCachedOrgBranding()).toBeNull();
  });

  it('applyCachedBrandingToDocument sets css vars on documentElement', () => {
    cacheOrgBranding(SAMPLE);
    expect(applyCachedBrandingToDocument()).toBe(true);
    const vars = brandingCssVars(SAMPLE);
    expect(mockDoc.documentElement.style.getPropertyValue('--color-brand-primary')).toBe(
      vars['--color-brand-primary']
    );
    expect(mockDoc.documentElement.style.getPropertyValue('--color-brand-secondary')).toBe(
      vars['--color-brand-secondary']
    );
  });

  it('applyCachedBrandingToDocument returns false when cache is empty', () => {
    expect(applyCachedBrandingToDocument()).toBe(false);
  });
});
