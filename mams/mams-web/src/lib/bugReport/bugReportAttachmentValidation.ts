import {
  BUG_REPORT_ATTACHMENT_MIME_TYPES,
  MAX_BUG_REPORT_ATTACHMENT_BYTES,
  MAX_BUG_REPORT_ATTACHMENTS,
} from '@mams/types';

const ALLOWED = new Set<string>(BUG_REPORT_ATTACHMENT_MIME_TYPES);

export function validateBugReportAttachmentFile(file: File): string | null {
  const mime = file.type.split(';')[0]?.trim().toLowerCase() || '';
  const allowedByExt =
    /\.(jpe?g|png|webp|gif|pdf)$/i.test(file.name) &&
    (!mime || mime === 'application/octet-stream');

  if (!ALLOWED.has(mime) && !allowedByExt) {
    return `${file.name}: only images and PDF files are allowed`;
  }
  if (file.size > MAX_BUG_REPORT_ATTACHMENT_BYTES) {
    return `${file.name}: must be 10MB or smaller`;
  }
  if (file.size <= 0) {
    return `${file.name}: file is empty`;
  }
  return null;
}

export function mergeBugReportAttachmentFiles(
  current: File[],
  incoming: File[]
): { files: File[]; error: string | null } {
  const merged = [...current];
  for (const file of incoming) {
    if (merged.length >= MAX_BUG_REPORT_ATTACHMENTS) {
      return {
        files: merged,
        error: `Maximum ${MAX_BUG_REPORT_ATTACHMENTS} files allowed`,
      };
    }
    const err = validateBugReportAttachmentFile(file);
    if (err) return { files: merged, error: err };
    const dup = merged.some((f) => f.name === file.name && f.size === file.size);
    if (!dup) merged.push(file);
  }
  return { files: merged, error: null };
}

export function isBugReportImageMime(mime: string): boolean {
  return mime.startsWith('image/');
}
