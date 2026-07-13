import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { ApiError } from '../middleware/error.js';

/**
 * Report files (compliance/financial XLSX exports) can exceed MongoDB's 16MB BSON
 * document limit for large staff counts, so they're stored on disk (like bug report
 * videos) with only the relative path kept in the ReportJob document.
 */

function mediaRoot(): string {
  return path.resolve(env.REPORT_MEDIA_DIR);
}

export async function ensureReportMediaDir(): Promise<void> {
  await fs.mkdir(mediaRoot(), { recursive: true });
}

/** Relative path stored in MongoDB, e.g. `{jobId}/compliance-attendance-2026-07.xlsx` */
export async function saveReportFile(
  jobId: string,
  buffer: Buffer,
  filename: string
): Promise<string> {
  const relativePath = path.join(jobId, filename);
  const absolutePath = path.join(mediaRoot(), relativePath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);

  return relativePath.split(path.sep).join('/');
}

export function resolveReportFilePath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/');
  if (normalized.includes('..') || path.isAbsolute(normalized)) {
    throw new ApiError(400, 'validation_error', 'Invalid report path');
  }
  const absolute = path.join(mediaRoot(), normalized);
  const resolved = path.resolve(absolute);
  const root = path.resolve(mediaRoot());
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new ApiError(400, 'validation_error', 'Invalid report path');
  }
  return resolved;
}

export async function readReportFile(relativePath: string): Promise<Buffer> {
  const absolute = resolveReportFilePath(relativePath);
  return fs.readFile(absolute);
}

export async function deleteReportFile(relativePath: string): Promise<void> {
  try {
    const absolute = resolveReportFilePath(relativePath);
    await fs.rm(path.dirname(absolute), { recursive: true, force: true });
  } catch {
    /* ignore missing files during cleanup */
  }
}
