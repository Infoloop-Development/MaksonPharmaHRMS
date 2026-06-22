import { z } from 'zod';

export const ORG_BRAND_FONT_FAMILIES = [
  'DM Sans',
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Poppins',
  'Source Sans 3',
  'Nunito Sans',
  'Montserrat',
  'Raleway',
  'Work Sans',
  'Ubuntu',
  'Fira Sans',
  'Lexend',
  'Plus Jakarta Sans',
  'Oswald',
  'Merriweather',
  'Playfair Display',
] as const;

export type OrgBrandFontFamily = (typeof ORG_BRAND_FONT_FAMILIES)[number];

export const HexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be #RRGGBB hex color');

export const OrgBrandingSchema = z.object({
  primaryColor: HexColorSchema,
  secondaryColor: HexColorSchema,
  fontFamily: z.enum(ORG_BRAND_FONT_FAMILIES),
  logoPalette: z.array(HexColorSchema).max(6).default([]),
});

export type OrgBranding = z.infer<typeof OrgBrandingSchema>;

export const DEFAULT_ORG_BRANDING: OrgBranding = {
  primaryColor: '#1A2878',
  secondaryColor: '#E82C2C',
  fontFamily: 'DM Sans',
  logoPalette: ['#1A2878', '#2E3F99', '#E82C2C'],
};

export const OrgBrandingPatchSchema = OrgBrandingSchema.partial();

export function normalizeOrgBranding(raw: Partial<OrgBranding> | null | undefined): OrgBranding {
  const parsed = OrgBrandingSchema.safeParse({ ...DEFAULT_ORG_BRANDING, ...raw });
  if (parsed.success) return parsed.data;
  return { ...DEFAULT_ORG_BRANDING };
}
