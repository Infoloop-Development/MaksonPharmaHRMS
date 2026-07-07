/**
 * Delete all bug reports, comments, related notifications, and on-disk media.
 * Run from monorepo root: npm run purge:bug-reports -w mams-server
 * Requires: PURGE_BUG_REPORTS_CONFIRM=yes
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { connectDb, disconnectDb } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { BugReportModel } from '../src/models/BugReport.js';
import { BugReportCommentModel } from '../src/models/BugReportComment.js';
import { NotificationModel } from '../src/models/Notification.js';
import { resolveBugReportMediaRoot } from '../src/services/bugReportMedia.storage.js';
import { logger } from '../src/utils/logger.js';

async function purgeMediaDir(): Promise<number> {
  const root = resolveBugReportMediaRoot();
  let removed = 0;
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      await fs.rm(path.join(root, entry.name), { recursive: true, force: true });
      removed += 1;
    }
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return 0;
    throw err;
  }
  return removed;
}

async function main() {
  if (process.env.PURGE_BUG_REPORTS_CONFIRM !== 'yes') {
    console.error('Refusing to run. Set PURGE_BUG_REPORTS_CONFIRM=yes to delete all bug reports.');
    process.exit(1);
  }

  await connectDb();

  const [reportCount, commentCount] = await Promise.all([
    BugReportModel.countDocuments(),
    BugReportCommentModel.countDocuments(),
  ]);

  const notifResult = await NotificationModel.deleteMany({
    $or: [
      { entityType: 'bug_report' },
      { kind: { $in: ['bug_assigned', 'bug_mentioned', 'bug_resolved'] } },
    ],
  });

  const commentResult = await BugReportCommentModel.deleteMany({});
  const reportResult = await BugReportModel.deleteMany({});
  const mediaDirsRemoved = await purgeMediaDir();

  logger.info('purgeBugReports: complete', {
    mongoUriHost: env.MONGO_URI.replace(/\/\/[^@]+@/, '//***@'),
    reportsDeleted: reportResult.deletedCount,
    commentsDeleted: commentResult.deletedCount,
    notificationsDeleted: notifResult.deletedCount,
    mediaDirsRemoved,
    hadReports: reportCount,
    hadComments: commentCount,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        reportsDeleted: reportResult.deletedCount,
        commentsDeleted: commentResult.deletedCount,
        notificationsDeleted: notifResult.deletedCount,
        mediaDirsRemoved,
      },
      null,
      2
    )
  );

  await disconnectDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
