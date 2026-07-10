import { Types } from 'mongoose';
import { isBugPublicId } from '@mams/types';
import { BugReportModel } from '../models/BugReport.js';
import { SettingsModel } from '../models/Settings.js';
import { ApiError } from '../middleware/error.js';

export function formatBugPublicId(n: number): string {
  if (n < 1) throw new ApiError(500, 'internal_error', 'Invalid bug report sequence');
  return `BUG-${String(n).padStart(4, '0')}`;
}

function parseBugPublicIdSuffix(publicId: string): number | null {
  const match = /^BUG-(\d+)$/.exec(publicId);
  if (!match) return null;
  return Number.parseInt(match[1]!, 10);
}

/** Atomically allocate the next human-readable bug id. */
export async function allocateNextBugPublicId(): Promise<string> {
  const updated = await SettingsModel.findOneAndUpdate(
    {},
    { $inc: { bugReportSequence: 1 } },
    { new: true, upsert: true }
  );
  const n = updated?.bugReportSequence ?? 1;
  return formatBugPublicId(n);
}

/** Backfill missing publicIds and sync the sequence counter to the highest suffix in use. */
export async function syncBugReportSequenceFromDb(): Promise<void> {
  const missing = await BugReportModel.find({
    $or: [{ publicId: { $exists: false } }, { publicId: null }, { publicId: '' }],
  })
    .sort({ createdAt: 1 })
    .select('_id')
    .lean();

  for (const doc of missing) {
    const publicId = await allocateNextBugPublicId();
    await BugReportModel.updateOne({ _id: doc._id }, { $set: { publicId } });
  }

  const agg = await BugReportModel.aggregate<{ maxSuffix: number }>([
    { $match: { publicId: { $regex: /^BUG-\d+$/ } } },
    {
      $project: {
        suffix: {
          $toInt: {
            $substrCP: ['$publicId', 4, { $subtract: [{ $strLenCP: '$publicId' }, 4] }],
          },
        },
      },
    },
    { $group: { _id: null, maxSuffix: { $max: '$suffix' } } },
  ]);
  const maxFromDb = agg[0]?.maxSuffix ?? 0;
  let doc = await SettingsModel.findOne();
  if (!doc) doc = await SettingsModel.create({});
  const cur = doc.bugReportSequence ?? 0;
  const next = Math.max(cur, maxFromDb);
  if (next > cur) {
    await SettingsModel.updateOne({}, { $set: { bugReportSequence: next } });
  }
}

/** Resolve a route/API ref (BUG-xxxx or Mongo ObjectId) to the document's Mongo _id. */
export async function resolveBugReportRef(ref: string): Promise<string> {
  if (!ref?.trim()) throw new ApiError(404, 'not_found', 'Bug report not found');

  if (isBugPublicId(ref)) {
    const doc = await BugReportModel.findOne({ publicId: ref });
    if (!doc) throw new ApiError(404, 'not_found', 'Bug report not found');
    return String(doc._id);
  }

  if (Types.ObjectId.isValid(ref)) {
    const doc = await BugReportModel.findById(ref);
    if (!doc) throw new ApiError(404, 'not_found', 'Bug report not found');
    return String(doc._id);
  }

  throw new ApiError(404, 'not_found', 'Bug report not found');
}

export { parseBugPublicIdSuffix };
