import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from '../middleware/error.js';

export const MAX_BUG_REPORT_VIDEO_BYTES = 100 * 1024 * 1024;

const ALLOWED_VIDEO_MIMES = new Set(['video/webm', 'video/mp4']);

const MIME_EXT: Record<string, string> = {
  'video/webm': 'webm',
  'video/mp4': 'mp4',
};

function mediaRoot(): string {
  return path.resolve(env.BUG_REPORT_MEDIA_DIR);
}

export function resolveBugReportMediaRoot(): string {
  return mediaRoot();
}

export async function ensureBugReportMediaDir(): Promise<void> {
  await fs.mkdir(mediaRoot(), { recursive: true });
}

/** Strip codec params and infer from filename when browsers send generic types. */
export function normalizeBugReportVideoMime(
  mimeType: string | undefined | null,
  filename?: string
): string {
  const base = (mimeType ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
  if (ALLOWED_VIDEO_MIMES.has(base)) return base;

  const ext = filename ? path.extname(filename).toLowerCase() : '';
  if (ext === '.webm') return 'video/webm';
  if (ext === '.mp4') return 'video/mp4';

  // Screen recordings from MediaRecorder are webm even when type is missing or generic.
  if (!base || base === 'application/octet-stream') return 'video/webm';

  return base;
}

export function validateBugReportVideoMime(mimeType: string, filename?: string): void {
  const normalized = normalizeBugReportVideoMime(mimeType, filename);
  if (!ALLOWED_VIDEO_MIMES.has(normalized)) {
    throw new ApiError(400, 'invalid_file_type', 'Could not accept the recorded video. Please try again or submit without video.');
  }
}

export function validateBugReportVideoSize(size: number): void {
  if (size <= 0) {
    throw new ApiError(400, 'validation_error', 'Video file is empty');
  }
  if (size > MAX_BUG_REPORT_VIDEO_BYTES) {
    throw new ApiError(400, 'file_too_large', 'Video exceeds maximum size (100MB)');
  }
}

/** Relative path stored in MongoDB, e.g. `{reportId}/recording.webm` */
export async function saveBugReportVideo(
  reportId: string,
  buffer: Buffer,
  mimeType: string,
  filename?: string
): Promise<string> {
  const normalizedMime = normalizeBugReportVideoMime(mimeType, filename);
  validateBugReportVideoMime(normalizedMime, filename);
  validateBugReportVideoSize(buffer.length);

  const ext = MIME_EXT[normalizedMime] ?? 'webm';
  const relativePath = path.join(reportId, `recording.${ext}`);
  const absolutePath = path.join(mediaRoot(), relativePath);

  await ensureBugReportMediaDir();
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);

  return relativePath.split(path.sep).join('/');
}

export async function deleteBugReportVideo(relativePath: string): Promise<void> {
  try {
    const absolute = resolveBugReportMediaPath(relativePath);
    await fs.unlink(absolute);
  } catch {
    /* ignore missing files during cleanup */
  }
}

export async function bugReportVideoExists(relativePath: string): Promise<boolean> {
  try {
    const absolute = resolveBugReportMediaPath(relativePath);
    await fs.access(absolute);
    return true;
  } catch {
    return false;
  }
}

export const MAX_BUG_REPORT_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_BUG_REPORT_ATTACHMENTS = 5;
export const MAX_BUG_REPORT_ATTACHMENTS_TOTAL_BYTES = 30 * 1024 * 1024;

const ALLOWED_ATTACHMENT_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

const ATTACHMENT_MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};

export function resolveBugReportMediaPath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/');
  if (normalized.includes('..') || path.isAbsolute(normalized)) {
    throw new ApiError(400, 'validation_error', 'Invalid media path');
  }
  const absolute = path.join(mediaRoot(), normalized);
  const resolved = path.resolve(absolute);
  const root = path.resolve(mediaRoot());
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new ApiError(400, 'validation_error', 'Invalid media path');
  }
  return resolved;
}

/** @deprecated Use resolveBugReportMediaPath */
export function resolveBugReportVideoPath(relativePath: string): string {
  return resolveBugReportMediaPath(relativePath);
}

export function normalizeBugReportAttachmentMime(
  mimeType: string | undefined | null,
  filename?: string
): string {
  const base = (mimeType ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
  if (ALLOWED_ATTACHMENT_MIMES.has(base)) return base;

  const ext = filename ? path.extname(filename).toLowerCase() : '';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.pdf') return 'application/pdf';

  return base;
}

export function validateBugReportAttachmentMime(mimeType: string, filename?: string): void {
  const normalized = normalizeBugReportAttachmentMime(mimeType, filename);
  if (!ALLOWED_ATTACHMENT_MIMES.has(normalized)) {
    throw new ApiError(
      400,
      'invalid_file_type',
      'Only images (JPEG, PNG, WebP, GIF) and PDF files are allowed'
    );
  }
}

export function validateBugReportAttachmentSize(size: number): void {
  if (size <= 0) {
    throw new ApiError(400, 'validation_error', 'File is empty');
  }
  if (size > MAX_BUG_REPORT_ATTACHMENT_BYTES) {
    throw new ApiError(400, 'file_too_large', 'Each file must be 10MB or smaller');
  }
}

function sanitizeOriginalName(name: string): string {
  const base = path.basename(name || 'attachment').replace(/[^\w.\- ()[\]]+/g, '_');
  return base.slice(0, 200) || 'attachment';
}

export async function saveBugReportAttachment(
  reportId: string,
  buffer: Buffer,
  mimeType: string,
  originalName: string
): Promise<string> {
  const safeName = sanitizeOriginalName(originalName);
  const normalizedMime = normalizeBugReportAttachmentMime(mimeType, safeName);
  validateBugReportAttachmentMime(normalizedMime, safeName);
  validateBugReportAttachmentSize(buffer.length);

  const ext = ATTACHMENT_MIME_EXT[normalizedMime] ?? 'bin';
  const fileId = crypto.randomUUID();
  const relativePath = path.join(reportId, 'attachments', `${fileId}.${ext}`);
  const absolutePath = path.join(mediaRoot(), relativePath);

  await ensureBugReportMediaDir();
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);

  return relativePath.split(path.sep).join('/');
}

export async function deleteBugReportAttachment(relativePath: string): Promise<void> {
  try {
    const absolute = resolveBugReportMediaPath(relativePath);
    await fs.unlink(absolute);
  } catch {
    /* ignore missing files during cleanup */
  }
}

const COMMENT_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const MAX_BUG_REPORT_COMMENT_IMAGE_BYTES = 5 * 1024 * 1024;

export function validateBugReportCommentImageMime(mimeType: string, filename?: string): void {
  const base = (mimeType ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
  if (COMMENT_IMAGE_MIMES.has(base)) return;
  const ext = filename ? path.extname(filename).toLowerCase() : '';
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) return;
  throw new ApiError(400, 'invalid_file_type', 'Comment attachments must be images');
}

export function validateBugReportCommentImageSize(size: number): void {
  if (size <= 0) throw new ApiError(400, 'validation_error', 'Image is empty');
  if (size > MAX_BUG_REPORT_COMMENT_IMAGE_BYTES) {
    throw new ApiError(400, 'file_too_large', 'Comment image must be 5MB or smaller');
  }
}

export async function saveBugReportCommentImage(
  reportId: string,
  buffer: Buffer,
  mimeType: string,
  originalName: string
): Promise<string> {
  validateBugReportCommentImageMime(mimeType, originalName);
  validateBugReportCommentImageSize(buffer.length);
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  const base = mimeType.split(';')[0]?.trim().toLowerCase() ?? 'image/jpeg';
  const ext = extMap[base] ?? 'jpg';
  const fileId = crypto.randomUUID();
  const relativePath = path.join(reportId, 'comments', `${fileId}.${ext}`);
  const absolutePath = path.join(mediaRoot(), relativePath);
  await ensureBugReportMediaDir();
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);
  return relativePath.split(path.sep).join('/');
}
