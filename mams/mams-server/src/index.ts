import { buildApp } from './app.js';
import { connectDb } from './config/db.js';
import { loadFeatureFlagOverrides } from './services/featureFlags.service.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { backfillAllUsersRoleDefaultPermissions } from './services/userPermissionBackfill.service.js';
import { startComplianceScheduler } from './services/complianceScheduler.service.js';
import { startReportJobRunner } from './services/reportJobRunner.service.js';

async function main() {
  await connectDb();
  await loadFeatureFlagOverrides();
  await backfillAllUsersRoleDefaultPermissions();
  startComplianceScheduler();
  startReportJobRunner();
  const app = buildApp();
  app.listen(env.PORT, () => {
    logger.info(`mams-server listening`, {
      port: env.PORT,
      env: env.NODE_ENV,
      corsOrigin: env.CORS_ORIGIN,
      publicAppUrl: env.PUBLIC_APP_URL,
    });
    if (env.NODE_ENV === 'production' && env.CORS_ORIGIN.includes('localhost')) {
      logger.warn('CORS_ORIGIN still points at localhost — set it to your Netlify URL on Render', {
        corsOrigin: env.CORS_ORIGIN,
      });
    }
  });
}

main().catch((err) => {
  logger.error('fatal', { err: String(err) });
  process.exit(1);
});
