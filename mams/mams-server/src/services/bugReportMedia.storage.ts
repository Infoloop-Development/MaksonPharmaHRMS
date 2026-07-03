import fs from 'node:fs/promises';
import path from 'node:path';
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

export function resolveBugReportVideoPath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/');
  if (normalized.includes('..') || path.isAbsolute(normalized)) {
    throw new ApiError(400, 'validation_error', 'Invalid video path');
  }
  const absolute = path.join(mediaRoot(), normalized);
  const resolved = path.resolve(absolute);
  const root = path.resolve(mediaRoot());
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new ApiError(400, 'validation_error', 'Invalid video path');
  }
  return resolved;
}

export async function deleteBugReportVideo(relativePath: string): Promise<void> {
  try {
    const absolute = resolveBugReportVideoPath(relativePath);
    await fs.unlink(absolute);
  } catch {
    /* ignore missing files during cleanup */
  }
}

export async function bugReportVideoExists(relativePath: string): Promise<boolean> {
  try {
    const absolute = resolveBugReportVideoPath(relativePath);
    await fs.access(absolute);
    return true;
  } catch {
    return false;
  }
}
