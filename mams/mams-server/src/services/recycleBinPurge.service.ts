import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import { audit } from './audit.service.js';
import { purgeExpiredRecycleBinItems } from './recycleBin.service.js';

let started = false;

export function startRecycleBinPurgeScheduler(): void {
  if (started) return;
  started = true;

  cron.schedule(
    '30 1 * * *',
    async () => {
      logger.info('recycle_bin_purge_run');
      try {
        const counts = await purgeExpiredRecycleBinItems();
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        if (total > 0) {
          await audit('recycle_bin_auto_purge', { userId: null }, { payload: counts });
        }
        logger.info('recycle_bin_purge_complete', counts);
      } catch (err) {
        logger.error('recycle_bin_purge_failed', { err: String(err) });
      }
    },
    { timezone: 'Asia/Kolkata' }
  );

  logger.info('recycle_bin_purge_scheduler_started', { timezone: 'Asia/Kolkata', schedule: '30 1 * * *' });
}
