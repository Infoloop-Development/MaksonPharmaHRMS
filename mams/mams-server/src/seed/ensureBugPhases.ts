import { DEFAULT_BUG_PHASES, type BugPhaseLegacyKey } from '@mams/types';
import { BugPhaseModel } from '../models/BugPhase.js';
import { BugReportModel } from '../models/BugReport.js';
import { logger } from '../utils/logger.js';

export async function ensureBugPhases(): Promise<void> {
  const count = await BugPhaseModel.countDocuments();
  if (count === 0) {
    await BugPhaseModel.insertMany(
      DEFAULT_BUG_PHASES.map((p) => ({
        label: p.label,
        order: p.order,
        isResolvedState: p.isResolvedState,
        legacyKey: p.legacyKey,
      }))
    );
    logger.info('ensureBugPhases: seeded default bug phases');
  }

  const phases = await BugPhaseModel.find().lean();
  const byLegacy = new Map<string, (typeof phases)[number]>();
  for (const p of phases) {
    if (p.legacyKey) byLegacy.set(p.legacyKey, p);
  }

  const missingPhase = await BugReportModel.find({
    $or: [{ phaseId: null }, { phaseId: { $exists: false } }],
  })
    .select('_id status')
    .lean();

  if (missingPhase.length === 0) return;

  const defaultPhase = [...phases].sort((a, b) => a.order - b.order)[0];
  let updated = 0;

  for (const report of missingPhase) {
    const legacy = (report.status ?? 'new') as BugPhaseLegacyKey;
    const phase = byLegacy.get(legacy) ?? defaultPhase;
    if (!phase) continue;
    await BugReportModel.updateOne({ _id: report._id }, { $set: { phaseId: phase._id } });
    updated += 1;
  }

  if (updated > 0) {
    logger.info('ensureBugPhases: backfilled phaseId on bug reports', { count: updated });
  }
}
