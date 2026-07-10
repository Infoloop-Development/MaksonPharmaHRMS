import { connectDb } from '../src/config/db.js';
import { syncBugReportSequenceFromDb } from '../src/services/bugPublicId.service.js';
import { logger } from '../src/utils/logger.js';

async function main() {
  await connectDb();
  await syncBugReportSequenceFromDb();
  logger.info('bug_public_id_backfill_complete');
  process.exit(0);
}

main().catch((err) => {
  logger.error('bug_public_id_backfill_failed', { err: String(err) });
  process.exit(1);
});
