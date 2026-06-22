import type { OrgBranding } from '@mams/types';
import { normalizeOrgBranding } from '@mams/types';
import { brandingCssVars } from './orgBrandingTheme';

export const ORG_BRANDING_STORAGE_KEY = 'mams-org-branding';

type CachedOrgBranding = {
  v: 1;
  branding: OrgBranding;
  cssVars: Record<string, string>;
};

function readCachedPayload(): CachedOrgBranding | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ORG_BRANDING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedOrgBranding;
    if (parsed?.v !== 1 || !parsed.cssVars || typeof parsed.cssVars !== 'object') return null;
    const branding = normalizeOrgBranding(parsed.branding);
    return { v: 1, branding, cssVars: parsed.cssVars };
  } catch {
    return null;
  }
}

export function cacheOrgBranding(branding: OrgBranding): void {
  if (typeof localStorage === 'undefined') return;
  const normalized = normalizeOrgBranding(branding);
  const payload: CachedOrgBranding = {
    v: 1,
    branding: normalized,
    cssVars: brandingCssVars(normalized),
  };
  localStorage.setItem(ORG_BRANDING_STORAGE_KEY, JSON.stringify(payload));
}

export function readCachedOrgBranding(): OrgBranding | null {
  return readCachedPayload()?.branding ?? null;
}

export function applyCssVarsToDocument(cssVars: Record<string, string>): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const [key, value] of Object.entries(cssVars)) {
    root.style.setProperty(key, value);
  }
  const font = cssVars['--font-brand-sans'];
  if (font) root.style.setProperty('font-family', font);
}

export function applyCachedBrandingToDocument(): boolean {
  const cached = readCachedPayload();
  if (!cached) return false;
  applyCssVarsToDocument(cached.cssVars);
  return true;
}

/** Bootstrap org branding before React hydrates (see index.html inline script). */
export function bootstrapOrgBrandingFromCache(): void {
  applyCachedBrandingToDocument();
}
