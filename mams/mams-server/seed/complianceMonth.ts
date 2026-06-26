/**
 * Backfill compliance-generated attendance for every weekday in a month.
 *
 * Run: npm run seed:compliance-month
 * Env: SEED_COMPLIANCE_MONTH (default 2026-05)
 */
import { connectDb, disconnectDb } from '../src/config/db.js';
import { runComplianceAutogenForMonth } from '../src/services/complianceAutogen.service.js';
import { logger } from '../src/utils/logger.js';

async function main() {
  const yearMonth = process.env.SEED_COMPLIANCE_MONTH?.trim() || '2026-05';
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
    throw new Error('SEED_COMPLIANCE_MONTH must be YYYY-MM');
  }

  await connectDb();
  logger.info('compliance_month_seed_start', { yearMonth });
  const result = await runComplianceAutogenForMonth(yearMonth);
  logger.info('compliance_month_seed_done', result);
  console.log(
    `Done: ${result.generated} records across ${result.weekdaysProcessed} weekdays in ${result.yearMonth}`
  );
  await disconnectDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
