import { buildApp } from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

async function main() {
  await connectDb();
  const app = buildApp();
  app.listen(env.PORT, () => {
    logger.info(`mams-server listening`, { port: env.PORT, env: env.NODE_ENV });
  });
}

main().catch((err) => {
  logger.error('fatal', { err: String(err) });
  process.exit(1);
});
