import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import {
  claimNextReportJob,
  purgeExpiredReportJobs,
  runReportJob,
} from './reportJob.service.js';

const POLL_MS = 3_000;
const PURGE_EVERY_POLLS = 120;

let started = false;
let running = false;
let pollCount = 0;
let timer: ReturnType<typeof setInterval> | null = null;

async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    pollCount += 1;
    if (pollCount % PURGE_EVERY_POLLS === 0) {
      const deleted = await purgeExpiredReportJobs();
      if (deleted > 0) {
        logger.info('report_jobs_purged', { deleted });
      }
    }

    const job = await claimNextReportJob();
    if (!job) return;

    logger.info('report_job_started', {
      jobId: String(job._id),
      type: job.type,
      yearMonth: job.yearMonth,
    });
    await runReportJob(job);
  } catch (err) {
    logger.error('report_job_runner_error', { err: String(err) });
  } finally {
    running = false;
  }
}

export function startReportJobRunner(): void {
  if (!env.REPORT_JOBS_ENABLED) {
    logger.info('report_job_runner_disabled');
    return;
  }
  if (started) return;
  started = true;

  void tick();
  timer = setInterval(() => {
    void tick();
  }, POLL_MS);

  logger.info('report_job_runner_started', { pollMs: POLL_MS });
}

export function stopReportJobRunner(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  started = false;
}
