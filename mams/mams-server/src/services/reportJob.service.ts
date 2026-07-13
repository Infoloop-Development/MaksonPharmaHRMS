import mongoose from 'mongoose';
import type {
  CreateReportJobBody,
  ReportJobStatusResponse,
  ReportJobType,
} from '@mams/types';
import { ReportJobModel, type ReportJobDoc } from '../models/ReportJob.js';
import { ApiError } from '../middleware/error.js';
import {
  buildComplianceMonthlyReportXlsx,
  complianceReportFilename,
  realLeaveDatesByEmployeeForMonth,
  REPORT_BUILD_MAX_MS,
  REPORT_BUILD_YIELD_EVERY,
  resolveComplianceReportEmployees,
  type ComplianceReportOverride,
} from './complianceMonthlyReport.service.js';
import {
  buildFinancialReportRows,
  buildFinancialReportXlsx,
  financialReportFilename,
} from './complianceFinancialReport.service.js';
import { XLSX_CONTENT_TYPE } from './plainXlsx.service.js';
import { saveReportFile, readReportFile, deleteReportFile } from './reportFile.storage.js';
import { logger } from '../utils/logger.js';

export const REPORT_TOO_LARGE_EMPLOYEES = 3000;

export const REPORT_GENERATION_FAILED_MESSAGE =
  'Report generation failed (likely timeout with large staff count). Try again off-peak or contact admin.';

const JOB_TTL_MS = 24 * 60 * 60 * 1000;

function expiresAtFromNow(): Date {
  return new Date(Date.now() + JOB_TTL_MS);
}

function toStatusResponse(doc: ReportJobDoc): ReportJobStatusResponse {
  return {
    jobId: String(doc._id),
    type: doc.type as ReportJobType,
    status: doc.status,
    yearMonth: doc.yearMonth,
    filename: doc.filename ?? null,
    errorMessage: doc.errorMessage ?? null,
    employeeCount: doc.employeeCount ?? null,
    processedCount: doc.processedCount ?? null,
    createdAt: doc.createdAt?.toISOString?.() ?? undefined,
    completedAt: doc.completedAt?.toISOString?.() ?? null,
  };
}

export async function enqueueReportJob(
  userId: string,
  body: CreateReportJobBody
): Promise<{ jobId: string; status: 'queued' }> {
  if (body.type === 'compliance_monthly') {
    const employees = await resolveComplianceReportEmployees(body.yearMonth, body.overrides);
    if (employees.length > REPORT_TOO_LARGE_EMPLOYEES) {
      throw new ApiError(
        503,
        'report_too_large',
        'Report too large for one download; contact admin or retry off-peak.'
      );
    }
  }

  const doc = await ReportJobModel.create({
    type: body.type,
    status: 'queued',
    yearMonth: body.yearMonth,
    overrides: body.type === 'compliance_monthly' ? body.overrides : [],
    requestedBy: new mongoose.Types.ObjectId(userId),
    expiresAt: expiresAtFromNow(),
  });

  return { jobId: String(doc._id), status: 'queued' };
}

export async function getReportJobForUser(
  jobId: string,
  userId: string,
  role: string
): Promise<ReportJobStatusResponse> {
  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    throw new ApiError(404, 'not_found', 'Report job not found');
  }

  const doc = await ReportJobModel.findById(jobId).lean();
  if (!doc) {
    throw new ApiError(404, 'not_found', 'Report job not found');
  }

  const requesterId = String(doc.requestedBy);
  if (requesterId !== userId && role !== 'org.admin') {
    throw new ApiError(403, 'forbidden', 'Not allowed to view this report job');
  }

  return toStatusResponse(doc as ReportJobDoc);
}

export async function getReportJobDownload(
  jobId: string,
  userId: string,
  role: string
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    throw new ApiError(404, 'not_found', 'Report job not found');
  }

  const doc = await ReportJobModel.findById(jobId);
  if (!doc) {
    throw new ApiError(404, 'not_found', 'Report job not found');
  }

  const requesterId = String(doc.requestedBy);
  if (requesterId !== userId && role !== 'org.admin') {
    throw new ApiError(403, 'forbidden', 'Not allowed to download this report');
  }

  if (doc.status !== 'completed' || !doc.filePath || !doc.filename) {
    throw new ApiError(409, 'not_ready', 'Report is not ready for download yet');
  }

  const buffer = await readReportFile(doc.filePath);

  return {
    buffer,
    filename: doc.filename,
    mimeType: doc.mimeType ?? XLSX_CONTENT_TYPE,
  };
}

export async function claimNextReportJob(): Promise<ReportJobDoc | null> {
  const doc = await ReportJobModel.findOneAndUpdate(
    { status: 'queued' },
    {
      $set: {
        status: 'running',
        startedAt: new Date(),
        processedCount: 0,
        errorMessage: null,
      },
    },
    { sort: { createdAt: 1 }, new: true }
  );

  return doc as ReportJobDoc | null;
}

async function failJob(jobId: mongoose.Types.ObjectId, message: string): Promise<void> {
  await ReportJobModel.updateOne(
    { _id: jobId },
    {
      $set: {
        status: 'failed',
        errorMessage: message,
        completedAt: new Date(),
        expiresAt: expiresAtFromNow(),
      },
    }
  );
}

async function completeJob(
  jobId: mongoose.Types.ObjectId,
  buffer: Buffer,
  filename: string,
  employeeCount: number | null
): Promise<void> {
  const filePath = await saveReportFile(String(jobId), buffer, filename);
  await ReportJobModel.updateOne(
    { _id: jobId },
    {
      $set: {
        status: 'completed',
        filename,
        mimeType: XLSX_CONTENT_TYPE,
        filePath,
        employeeCount,
        processedCount: employeeCount,
        completedAt: new Date(),
        expiresAt: expiresAtFromNow(),
        errorMessage: null,
      },
    }
  );
}

export async function runReportJob(job: ReportJobDoc): Promise<void> {
  const startedAt = Date.now();
  const jobId = job._id;

  try {
    if (job.type === 'financial') {
      const rows = await buildFinancialReportRows(job.yearMonth);
      const buffer = buildFinancialReportXlsx(rows);
      const filename = financialReportFilename(job.yearMonth);
      await completeJob(jobId, buffer, filename, rows.length);
      logger.info('report_job_completed', {
        jobId: String(jobId),
        type: job.type,
        yearMonth: job.yearMonth,
        employeeCount: rows.length,
        elapsedMs: Date.now() - startedAt,
      });
      return;
    }

    const overrides = (job.overrides ?? []) as ComplianceReportOverride[];
    const employees = await resolveComplianceReportEmployees(job.yearMonth, overrides);
    const employeeCount = employees.length;
    const realLeaveDatesByEmployee = await realLeaveDatesByEmployeeForMonth(job.yearMonth);

    await ReportJobModel.updateOne({ _id: jobId }, { $set: { employeeCount } });

    const onProgress = async (processed: number, total: number) => {
      if (processed % REPORT_BUILD_YIELD_EVERY !== 0 && processed !== total) return;
      await ReportJobModel.updateOne({ _id: jobId }, { $set: { processedCount: processed, employeeCount: total } });
    };

    let buffer: Buffer;
    try {
      buffer = await buildComplianceMonthlyReportXlsx(
        { yearMonth: job.yearMonth, employees, realLeaveDatesByEmployee },
        { startedAt, onProgress }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Report build failed';
      const isTimeout =
        message.includes('exceeded') || Date.now() - startedAt > REPORT_BUILD_MAX_MS - 5_000;
      if (isTimeout || employeeCount > 500) {
        throw new Error(REPORT_GENERATION_FAILED_MESSAGE);
      }
      throw err;
    }

    const filename = complianceReportFilename(job.yearMonth);
    await completeJob(jobId, buffer, filename, employeeCount);
    logger.info('report_job_completed', {
      jobId: String(jobId),
      type: job.type,
      yearMonth: job.yearMonth,
      employeeCount,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : REPORT_GENERATION_FAILED_MESSAGE;
    await failJob(jobId, message);
    logger.error('report_job_failed', {
      jobId: String(jobId),
      type: job.type,
      yearMonth: job.yearMonth,
      elapsedMs: Date.now() - startedAt,
      err: message,
    });
  }
}

export async function purgeExpiredReportJobs(): Promise<number> {
  const expired = await ReportJobModel.find({
    expiresAt: { $lte: new Date() },
    filePath: { $ne: null },
  })
    .select('filePath')
    .lean();

  await Promise.all(expired.map((doc) => deleteReportFile(doc.filePath!)));

  const result = await ReportJobModel.deleteMany({
    expiresAt: { $lte: new Date() },
  });
  return result.deletedCount ?? 0;
}
