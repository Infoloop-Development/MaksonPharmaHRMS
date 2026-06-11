import { z } from 'zod';

const BRAND_DATA_URL_RE =
  /^data:image\/(png|svg\+xml|jpeg|jpg|x-icon|vnd\.microsoft\.icon);base64,[A-Za-z0-9+/=]+$/;

const LOGO_MIME = new Set(['image/png', 'image/svg+xml', 'image/jpeg', 'image/jpg']);
const FAVICON_MIME = new Set(['image/png', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']);

export const LOGO_MAX_BYTES = 500 * 1024;
export const FAVICON_MAX_BYTES = 500 * 1024;
export const FAVICON_OUTPUT_MAX_PX = 512;
/** Max source file size before favicon crop (PNG/JPG). */
export const FAVICON_SOURCE_MAX_BYTES = 5 * 1024 * 1024;

function decodedByteLength(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? '';
  return Math.floor((base64.length * 3) / 4);
}

function mimeFromDataUrl(dataUrl: string): string | null {
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  return match?.[1] ?? null;
}

function brandDataUrlSchema(maxBytes: number, allowedMimes: Set<string>, label: string) {
  return z
    .string()
    .nullable()
    .superRefine((val, ctx) => {
      if (val === null) return;
      if (!BRAND_DATA_URL_RE.test(val)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} must be a valid base64 image data URL`,
        });
        return;
      }
      const mime = mimeFromDataUrl(val);
      if (!mime || !allowedMimes.has(mime)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} has unsupported image format`,
        });
        return;
      }
      if (decodedByteLength(val) > maxBytes) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} exceeds maximum file size`,
        });
      }
    });
}

export const CompanyLogoSchema = brandDataUrlSchema(LOGO_MAX_BYTES, LOGO_MIME, 'Company logo');
export const FaviconSchema = brandDataUrlSchema(FAVICON_MAX_BYTES, FAVICON_MIME, 'Favicon');

export function validateBrandDataUrl(
  dataUrl: string,
  kind: 'logo' | 'favicon'
): { ok: true } | { ok: false; message: string } {
  const schema = kind === 'logo' ? CompanyLogoSchema : FaviconSchema;
  const r = schema.safeParse(dataUrl);
  if (r.success) return { ok: true };
  return { ok: false, message: r.error.issues[0]?.message ?? 'Invalid brand asset' };
}
