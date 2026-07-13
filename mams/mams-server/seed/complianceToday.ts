/**
 * Generate compliance attendance for today (IST) or SEED_COMPLIANCE_DATE (YYYY-MM-DD).
 * Run: npm run seed:compliance-today
 */
import { connectDb, disconnectDb } from '../src/config/db.js';
import { runComplianceAutogenForDate } from '../src/services/complianceAutogen.service.js';
import { utcToIstDateString } from '../src/utils/time.js';
import { logger } from '../src/utils/logger.js';

async function main() {
  const targetDate =
    process.env.SEED_COMPLIANCE_DATE?.trim() || utcToIstDateString(new Date());

  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    throw new Error('SEED_COMPLIANCE_DATE must be YYYY-MM-DD');
  }

  await connectDb();
  logger.info('compliance_today_seed_start', { targetDate });
  const result = await runComplianceAutogenForDate(targetDate);
  logger.info('compliance_today_seed_done', result);
  console.log(
    `Done: ${result.generated} records for ${result.date}` +
      (result.skippedSunday ? ' (Sunday skipped)' : '')
  );
  await disconnectDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
