import { Types } from 'mongoose';
import {
  BugPhaseCreateBodySchema,
  BugPhasePatchBodySchema,
  BugPhaseReorderBodySchema,
  type BugPhase,
} from '@mams/types';
import { BugPhaseModel } from '../models/BugPhase.js';
import { BugReportModel } from '../models/BugReport.js';
import { ApiError } from '../middleware/error.js';

function serializePhase(
  doc: {
    _id: Types.ObjectId;
    label: string;
    order: number;
    isResolvedState: boolean;
    legacyKey?: string | null;
  },
  reportCount?: number
): BugPhase {
  return {
    id: String(doc._id),
    label: doc.label,
    order: doc.order,
    isResolvedState: Boolean(doc.isResolvedState),
    legacyKey: (doc.legacyKey as BugPhase['legacyKey']) ?? null,
    reportCount,
  };
}

export async function listBugPhases(): Promise<BugPhase[]> {
  const phases = await BugPhaseModel.find().sort({ order: 1 }).lean();
  const counts = await BugReportModel.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { phaseId: { $ne: null } } },
    { $group: { _id: '$phaseId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

  return phases.map((p) => serializePhase(p, countMap.get(String(p._id)) ?? 0));
}

export async function getBugPhaseById(id: string) {
  if (!Types.ObjectId.isValid(id)) throw new ApiError(404, 'not_found', 'Phase not found');
  const phase = await BugPhaseModel.findById(id).lean();
  if (!phase) throw new ApiError(404, 'not_found', 'Phase not found');
  const count = await BugReportModel.countDocuments({ phaseId: phase._id });
  return serializePhase(phase, count);
}

export async function createBugPhase(body: unknown): Promise<BugPhase> {
  const parsed = BugPhaseCreateBodySchema.parse(body);
  const maxOrder = await BugPhaseModel.findOne().sort({ order: -1 }).select('order').lean();
  const order = (maxOrder?.order ?? -1) + 1;
  const doc = await BugPhaseModel.create({
    label: parsed.label,
    order,
    isResolvedState: parsed.isResolvedState ?? false,
    legacyKey: null,
  });
  return serializePhase(doc.toObject(), 0);
}

export async function patchBugPhase(id: string, body: unknown): Promise<BugPhase> {
  const parsed = BugPhasePatchBodySchema.parse(body);
  const doc = await BugPhaseModel.findById(id);
  if (!doc) throw new ApiError(404, 'not_found', 'Phase not found');
  if (parsed.label !== undefined) doc.label = parsed.label;
  if (parsed.isResolvedState !== undefined) doc.isResolvedState = parsed.isResolvedState;
  await doc.save();
  const count = await BugReportModel.countDocuments({ phaseId: doc._id });
  return serializePhase(doc.toObject(), count);
}

export async function reorderBugPhases(body: unknown): Promise<BugPhase[]> {
  const parsed = BugPhaseReorderBodySchema.parse(body);
  const ids = parsed.phaseIds.filter((id) => Types.ObjectId.isValid(id));
  const phases = await BugPhaseModel.find({ _id: { $in: ids } });
  if (phases.length !== ids.length) {
    throw new ApiError(400, 'validation_error', 'One or more phase ids are invalid');
  }
  const idSet = new Set(ids);
  const total = await BugPhaseModel.countDocuments();
  if (idSet.size !== total) {
    throw new ApiError(400, 'validation_error', 'phaseIds must include every phase');
  }

  await Promise.all(
    ids.map((phaseId, order) => BugPhaseModel.updateOne({ _id: phaseId }, { $set: { order } }))
  );
  return listBugPhases();
}

export async function deleteBugPhase(
  id: string,
  reassignToPhaseId?: string
): Promise<void> {
  if (!Types.ObjectId.isValid(id)) throw new ApiError(404, 'not_found', 'Phase not found');
  const phase = await BugPhaseModel.findById(id);
  if (!phase) throw new ApiError(404, 'not_found', 'Phase not found');

  const reportCount = await BugReportModel.countDocuments({ phaseId: phase._id });
  if (reportCount > 0) {
    if (!reassignToPhaseId || !Types.ObjectId.isValid(reassignToPhaseId)) {
      throw new ApiError(409, 'conflict', `${reportCount} bug report(s) in this phase`, {
        reportCount,
      });
    }
    if (reassignToPhaseId === id) {
      throw new ApiError(400, 'validation_error', 'Cannot reassign to the same phase');
    }
    const target = await BugPhaseModel.findById(reassignToPhaseId);
    if (!target) throw new ApiError(404, 'not_found', 'Target phase not found');
    await BugReportModel.updateMany(
      { phaseId: phase._id },
      { $set: { phaseId: target._id, status: target.legacyKey ?? 'new' } }
    );
  }

  await phase.deleteOne();
}

export async function getDefaultPhaseId(): Promise<Types.ObjectId> {
  const phase = await BugPhaseModel.findOne().sort({ order: 1 });
  if (!phase) throw new ApiError(500, 'internal_error', 'No bug phases configured');
  return phase._id;
}

export async function loadPhaseMap(): Promise<
  Map<string, { id: string; label: string; legacyKey: string | null; isResolvedState: boolean }>
> {
  const phases = await BugPhaseModel.find().lean();
  const map = new Map<
    string,
    { id: string; label: string; legacyKey: string | null; isResolvedState: boolean }
  >();
  for (const p of phases) {
    map.set(String(p._id), {
      id: String(p._id),
      label: p.label,
      legacyKey: p.legacyKey ?? null,
      isResolvedState: Boolean(p.isResolvedState),
    });
  }
  return map;
}
