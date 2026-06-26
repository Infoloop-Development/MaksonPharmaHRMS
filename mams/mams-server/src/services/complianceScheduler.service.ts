import cron from 'node-cron';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { runComplianceAutogenForDate, yesterdayIstDateString } from './complianceAutogen.service.js';

let started = false;

export function startComplianceScheduler(): void {
  if (!env.COMPLIANCE_AUTOGEN_ENABLED) {
    logger.info('compliance_scheduler_disabled');
    return;
  }
  if (started) return;
  started = true;

  cron.schedule(
    '0 0 * * *',
    async () => {
      const targetDate = yesterdayIstDateString();
      logger.info('compliance_scheduler_run', { targetDate });
      try {
        await runComplianceAutogenForDate(targetDate);
      } catch (err) {
        logger.error('compliance_scheduler_failed', { err: String(err) });
      }
    },
    { timezone: 'Asia/Kolkata' }
  );

  logger.info('compliance_scheduler_started', { timezone: 'Asia/Kolkata', schedule: '0 0 * * *' });
}
