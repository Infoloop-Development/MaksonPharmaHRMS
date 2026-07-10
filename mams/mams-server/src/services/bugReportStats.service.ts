import { Types } from 'mongoose';
import {
  BugReportStatsQuerySchema,
  type BugReportSeverity,
  type BugReportStatsQuery,
  type BugReportStatsResponse,
} from '@mams/types';
import { BugReportModel } from '../models/BugReport.js';
import { BugReportCommentModel } from '../models/BugReportComment.js';
import { BugPhaseModel } from '../models/BugPhase.js';
import { UserModel } from '../models/User.js';
import { loadPhaseMap } from './bugPhase.service.js';
import {
  buildBugReportRaisedDateFilter,
  buildBugReportResolvedDateFilter,
} from './bugReportDateFilter.js';

type CountFacet = { n?: number }[];

function facetCount(rows: CountFacet | undefined): number {
  return rows?.[0]?.n ?? 0;
}

function emptySeverityBreakdown(): Record<BugReportSeverity, number> {
  return { low: 0, medium: 0, high: 0, critical: 0 };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

async function loadUserNames(
  ids: Array<string | null | undefined>
): Promise<Map<string, string>> {
  const unique = [
    ...new Set(
      ids
        .filter(Boolean)
        .map((id) => String(id))
        .filter((id) => Types.ObjectId.isValid(id))
    ),
  ];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const users = await UserModel.find({
    _id: { $in: unique.map((id) => new Types.ObjectId(id)) },
  })
    .select('name')
    .lean();
  for (const u of users) {
    map.set(String(u._id), u.name);
  }
  return map;
}

export async function getBugReportStats(query: BugReportStatsQuery): Promise<BugReportStatsResponse> {
  const q = BugReportStatsQuerySchema.parse(query);
  const phaseMap = await loadPhaseMap();
  const resolvedPhaseIds = [...phaseMap.values()]
    .filter((p) => p.isResolvedState)
    .map((p) => new Types.ObjectId(p.id));

  const baseFilter: Record<string, unknown> = {};
  const raisedDateFilter = buildBugReportRaisedDateFilter(q);
  if (raisedDateFilter) {
    baseFilter.createdAt = raisedDateFilter;
  }

  const notResolvedMatch =
    resolvedPhaseIds.length > 0
      ? { phaseId: { $nin: resolvedPhaseIds } }
      : {};
  const resolvedMatch =
    resolvedPhaseIds.length > 0 ? { phaseId: { $in: resolvedPhaseIds } } : { _id: { $exists: false } };

  const matchPipeline = Object.keys(baseFilter).length ? [{ $match: baseFilter }] : [];

  const resolvedDateFilter = buildBugReportResolvedDateFilter(q);
  const resolvedHistoryElemMatch: Record<string, unknown> = {
    phaseId: { $in: resolvedPhaseIds },
  };
  if (resolvedDateFilter) {
    resolvedHistoryElemMatch.changedAt = resolvedDateFilter;
  }

  const [
    facetResult,
    resolvedInRange,
    resolutionHours,
    commentStats,
    reporterGroups,
    assigneeGroups,
    orderedPhases,
  ] = await Promise.all([
    BugReportModel.aggregate<{
      totalRaised: CountFacet;
      totalOpen: CountFacet;
      totalSolved: CountFacet;
      unassigned: CountFacet;
      criticalOpen: CountFacet;
      overdue: CountFacet;
      bySeverity: Array<{ _id: BugReportSeverity; count: number }>;
      byPhase: Array<{ _id: Types.ObjectId | null; count: number }>;
      byModule: Array<{ _id: string; count: number }>;
      withVideo: CountFacet;
      withScreenshot: CountFacet;
      withAttachments: CountFacet;
      uniqueReporters: Array<{ _id: Types.ObjectId; count: number }>;
    }>([
      ...matchPipeline,
      {
        $facet: {
          totalRaised: [{ $count: 'n' }],
          totalOpen: [{ $match: notResolvedMatch }, { $count: 'n' }],
          totalSolved: [{ $match: resolvedMatch }, { $count: 'n' }],
          unassigned: [
            { $match: { ...notResolvedMatch, assigneeId: null } },
            { $count: 'n' },
          ],
          criticalOpen: [
            { $match: { ...notResolvedMatch, severity: 'critical' } },
            { $count: 'n' },
          ],
          overdue: [
            {
              $match: {
                ...notResolvedMatch,
                deadline: { $ne: null, $lt: new Date() },
              },
            },
            { $count: 'n' },
          ],
          bySeverity: [{ $group: { _id: '$severity', count: { $sum: 1 } } }],
          byPhase: [{ $group: { _id: '$phaseId', count: { $sum: 1 } } }],
          byModule: [
            { $group: { _id: '$module', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ],
          withVideo: [
            { $match: { 'video.filePath': { $exists: true, $nin: [null, ''] } } },
            { $count: 'n' },
          ],
          withScreenshot: [
            {
              $match: {
                $or: [
                  { 'screenshot.data': { $exists: true, $ne: null } },
                  { 'screenshot.data.0': { $exists: true } },
                ],
              },
            },
            { $count: 'n' },
          ],
          withAttachments: [
            { $match: { attachments: { $exists: true, $not: { $size: 0 } } } },
            { $count: 'n' },
          ],
          uniqueReporters: [{ $group: { _id: '$reporterId', count: { $sum: 1 } } }],
        },
      },
    ]),
    resolvedPhaseIds.length
      ? BugReportModel.countDocuments({
          statusHistory: { $elemMatch: resolvedHistoryElemMatch },
        })
      : Promise.resolve(0),
    resolvedPhaseIds.length
      ? BugReportModel.aggregate<{ resolutionHours: number }>([
          ...matchPipeline,
          { $match: resolvedMatch },
          {
            $addFields: {
              firstResolvedAt: {
                $min: {
                  $map: {
                    input: {
                      $filter: {
                        input: { $ifNull: ['$statusHistory', []] },
                        as: 'sh',
                        cond: { $in: ['$$sh.phaseId', resolvedPhaseIds] },
                      },
                    },
                    as: 'r',
                    in: '$$r.changedAt',
                  },
                },
              },
            },
          },
          {
            $match: { firstResolvedAt: { $ne: null } },
          },
          {
            $project: {
              resolutionHours: {
                $divide: [{ $subtract: ['$firstResolvedAt', '$createdAt'] }, 1000 * 60 * 60],
              },
            },
          },
        ])
      : Promise.resolve([]),
    BugReportCommentModel.aggregate<{
      totalComments: CountFacet;
      bugsWithComments: CountFacet;
    }>([
      {
        $lookup: {
          from: 'bugreports',
          localField: 'bugReportId',
          foreignField: '_id',
          as: 'report',
        },
      },
      { $unwind: '$report' },
      ...(Object.keys(baseFilter).length
        ? [{ $match: { 'report.createdAt': baseFilter.createdAt } }]
        : []),
      {
        $facet: {
          totalComments: [{ $count: 'n' }],
          bugsWithComments: [{ $group: { _id: '$bugReportId' } }, { $count: 'n' }],
        },
      },
    ]),
    BugReportModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      ...matchPipeline,
      { $group: { _id: '$reporterId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    BugReportModel.aggregate<{ _id: Types.ObjectId | null; count: number }>([
      ...matchPipeline,
      { $group: { _id: '$assigneeId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    BugPhaseModel.find().sort({ order: 1 }).lean(),
  ]);

  const facet = facetResult[0] ?? {
    totalRaised: [],
    totalOpen: [],
    totalSolved: [],
    unassigned: [],
    criticalOpen: [],
    overdue: [],
    bySeverity: [],
    byPhase: [],
    byModule: [],
    withVideo: [],
    withScreenshot: [],
    withAttachments: [],
    uniqueReporters: [],
  };

  const bySeverity = emptySeverityBreakdown();
  for (const row of facet.bySeverity ?? []) {
    if (row._id in bySeverity) {
      bySeverity[row._id as BugReportSeverity] = row.count;
    }
  }

  const phaseCountMap = new Map<string, number>();
  for (const row of facet.byPhase ?? []) {
    const id = row._id ? String(row._id) : '';
    phaseCountMap.set(id, row.count);
  }

  const byPhase = orderedPhases.map((phase) => ({
    phaseId: String(phase._id),
    label: phase.label,
    count: phaseCountMap.get(String(phase._id)) ?? 0,
    isResolvedState: Boolean(phase.isResolvedState),
  }));

  const byModule = (facet.byModule ?? []).map((row) => ({
    module: row._id,
    count: row.count,
  }));

  const reporterNameMap = await loadUserNames(reporterGroups.map((r) => String(r._id)));
  const topReporters = reporterGroups.map((row) => ({
    reporterId: String(row._id),
    name: reporterNameMap.get(String(row._id)) ?? 'Unknown',
    count: row.count,
  }));

  const assigneeNameMap = await loadUserNames(
    assigneeGroups.map((r) => (r._id ? String(r._id) : null))
  );
  const byAssignee = assigneeGroups.map((row) => ({
    assigneeId: row._id ? String(row._id) : null,
    name: row._id ? assigneeNameMap.get(String(row._id)) ?? 'Unknown' : 'Unassigned',
    count: row.count,
  }));

  const hours = resolutionHours.map((r) => r.resolutionHours).filter((h) => Number.isFinite(h));
  const avgResolutionHours =
    hours.length > 0 ? hours.reduce((sum, h) => sum + h, 0) / hours.length : null;
  const medianResolutionHours = median(hours);

  const commentFacet = commentStats[0] ?? { totalComments: [], bugsWithComments: [] };

  return {
    totalRaised: facetCount(facet.totalRaised),
    totalOpen: facetCount(facet.totalOpen),
    totalSolved: facetCount(facet.totalSolved),
    unassigned: facetCount(facet.unassigned),
    criticalOpen: facetCount(facet.criticalOpen),
    overdue: facetCount(facet.overdue),
    bySeverity,
    byPhase,
    byModule,
    byAssignee,
    resolvedInRange,
    avgResolutionHours,
    medianResolutionHours,
    withVideo: facetCount(facet.withVideo),
    withScreenshot: facetCount(facet.withScreenshot),
    withAttachments: facetCount(facet.withAttachments),
    totalComments: facetCount(commentFacet.totalComments),
    bugsWithComments: facetCount(commentFacet.bugsWithComments),
    uniqueReporters: (facet.uniqueReporters ?? []).length,
    topReporters,
  };
}
