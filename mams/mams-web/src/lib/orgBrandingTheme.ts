import type { OrgBranding } from '@mams/types';
import { DEFAULT_ORG_BRANDING } from '@mams/types';

export type Rgb = { r: number; g: number; b: number };

export function parseHex(hex: string): Rgb {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastTextOnBackground(bgHex: string): string {
  return relativeLuminance(bgHex) < 0.45 ? '#FFFFFF' : '#1A1F36';
}

export function lightenHex(hex: string, amount = 0.15): string {
  const { r, g, b } = parseHex(hex);
  return rgbToHex({
    r: r + (255 - r) * amount,
    g: g + (255 - g) * amount,
    b: b + (255 - b) * amount,
  });
}

export function rgbChannels(hex: string): string {
  const { r, g, b } = parseHex(hex);
  return `${r} ${g} ${b}`;
}

export function fontFamilyStack(font: string): string {
  return `"${font}", system-ui, sans-serif`;
}

export function brandingCssVars(branding: OrgBranding): Record<string, string> {
  const primary = branding.primaryColor.toUpperCase();
  const primaryLight = lightenHex(primary, 0.15);
  const secondary = branding.secondaryColor.toUpperCase();
  const primaryText = contrastTextOnBackground(primary);
  const isLightSidebar = primaryText !== '#FFFFFF';

  return {
    '--color-brand-primary': primary,
    '--color-brand-primary-rgb': rgbChannels(primary),
    '--color-brand-primary-light': primaryLight,
    '--color-brand-primary-light-rgb': rgbChannels(primaryLight),
    '--color-brand-primary-text': primaryText,
    '--color-brand-secondary': secondary,
    '--color-brand-secondary-rgb': rgbChannels(secondary),
    '--sidebar-text': primaryText,
    '--sidebar-text-muted': isLightSidebar ? 'rgba(26, 31, 54, 0.72)' : 'rgba(255, 255, 255, 0.72)',
    '--sidebar-border': isLightSidebar ? 'rgba(26, 31, 54, 0.12)' : 'rgba(255, 255, 255, 0.12)',
    '--sidebar-hover-bg': isLightSidebar ? 'rgba(26, 31, 54, 0.08)' : 'rgba(255, 255, 255, 0.1)',
    '--sidebar-active-bg': `color-mix(in srgb, ${secondary} 25%, transparent)`,
    '--font-brand-sans': fontFamilyStack(branding.fontFamily),
  };
}

export function applyBrandingToDocument(branding: OrgBranding): void {
  const root = document.documentElement;
  const vars = brandingCssVars(branding);
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  root.style.setProperty('font-family', vars['--font-brand-sans']!);
}

export function clearBrandingFromDocument(): void {
  applyBrandingToDocument(DEFAULT_ORG_BRANDING);
}

export const FONT_GOOGLE_URL =
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;600;700&family=Lato:wght@400;700&family=Poppins:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600;700&family=Nunito+Sans:wght@400;600;700&family=Montserrat:wght@400;500;600;700&family=Raleway:wght@400;500;600;700&family=Work+Sans:wght@400;500;600;700&family=Ubuntu:wght@400;500;700&family=Fira+Sans:wght@400;500;600;700&family=Lexend:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Oswald:wght@400;500;600;700&family=Merriweather:wght@400;700&family=Playfair+Display:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';

export function swatchOptions(palette: string[], selected: string, fallback: string[]): string[] {
  const base = palette.length >= 3 ? palette.slice(0, 3) : fallback.slice(0, 3);
  const uniq = new Set(base.map((c) => c.toUpperCase()));
  if (!uniq.has(selected.toUpperCase())) {
    return [selected, ...base].slice(0, 3);
  }
  return base;
}
