import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  BugReportExportQuerySchema,
  BugReportListQuerySchema,
  BugReportStatsQuerySchema,
  BugReportStatsResponseSchema,
  buildBugActivityTimeline,
  formatBugActivityTimelineText,
  formatTimelineLine,
  isBugPublicId,
  resolveBugResolvedTimestamp,
  type BugReportDetail,
} from '@mams/types';
import { formatBugPublicId } from '../src/services/bugPublicId.service.js';
import { buildBugReportRaisedDateFilter } from '../src/services/bugReportDateFilter.js';
import { istDateEndUtc, istDateStartUtc } from '../src/utils/time.js';

describe('bug public id helpers', () => {
  it('formats sequential ids', () => {
    expect(formatBugPublicId(1)).toBe('BUG-0001');
    expect(formatBugPublicId(1024)).toBe('BUG-1024');
  });

  it('recognizes public id pattern', () => {
    expect(isBugPublicId('BUG-1024')).toBe(true);
    expect(isBugPublicId('507f1f77bcf86cd799439011')).toBe(false);
  });
});

describe('BugReportListQuerySchema date filters', () => {
  it('accepts raisedFrom and raisedTo', () => {
    const q = BugReportListQuerySchema.parse({
      raisedFrom: '2026-01-01',
      raisedTo: '2026-01-31',
    });
    expect(q.raisedFrom).toBe('2026-01-01');
    expect(q.raisedTo).toBe('2026-01-31');
  });

  it('rejects pageSize above 100', () => {
    expect(() => BugReportListQuerySchema.parse({ pageSize: 200 })).toThrow();
    expect(BugReportListQuerySchema.parse({ pageSize: 100 }).pageSize).toBe(100);
  });
});

describe('buildBugReportRaisedDateFilter', () => {
  it('returns null when no dates', () => {
    expect(buildBugReportRaisedDateFilter({})).toBeNull();
  });

  it('builds IST day bounds', () => {
    const range = buildBugReportRaisedDateFilter({ raisedFrom: '2026-07-01', raisedTo: '2026-07-08' });
    expect(range?.$gte?.toISOString()).toBe(istDateStartUtc('2026-07-01').toISOString());
    expect(range?.$lte?.toISOString()).toBe(istDateEndUtc('2026-07-08').toISOString());
  });

  it('uses now as upper bound when only raisedFrom is set', () => {
    const before = Date.now();
    const range = buildBugReportRaisedDateFilter({ raisedFrom: '2026-07-01' });
    const after = Date.now();
    expect(range?.$gte?.toISOString()).toBe(istDateStartUtc('2026-07-01').toISOString());
    expect(range?.$lte?.getTime()).toBeGreaterThanOrEqual(before);
    expect(range?.$lte?.getTime()).toBeLessThanOrEqual(after);
  });
});

describe('buildBugActivityTimeline', () => {
  const base = {
    createdAt: '2026-07-01T10:00:00.000Z',
    reporter: { name: 'Alice' },
    statusHistory: [
      {
        phaseName: 'Under Development',
        phaseId: 'phase-dev',
        changedAt: '2026-07-02T12:00:00.000Z',
        changedBy: { id: 'u1', name: 'IT Admin' },
      },
    ],
    assignmentHistory: [
      {
        assignedAt: '2026-07-01T11:00:00.000Z',
        deadline: '2026-07-10',
        assignedBy: { id: 'u1', name: 'IT Admin' },
        assignedTo: { id: 'u2', name: 'Bob' },
      },
    ],
  };

  it('merges raised, status, and assignment events chronologically', () => {
    const timeline = buildBugActivityTimeline(base);
    expect(timeline).toHaveLength(3);
    expect(timeline[0]?.type).toBe('raised');
    expect(timeline[1]?.type).toBe('assignment');
    expect(timeline[2]?.type).toBe('status');
  });

  it('formats export lines', () => {
    const text = formatBugActivityTimelineText(base);
    expect(text).toContain('Bug Raised');
    expect(text).toContain('Status Change');
    expect(text).toContain('Assignment');
  });

  it('formats a single timeline line', () => {
    const timeline = buildBugActivityTimeline(base);
    expect(formatTimelineLine(timeline[0]!)).toContain('Bug Raised');
  });
});

describe('resolveBugResolvedTimestamp', () => {
  const detail = {
    phaseId: 'phase-resolved',
    updatedAt: '2026-07-05T00:00:00.000Z',
    statusHistory: [
      {
        phaseName: 'Developed',
        phaseId: 'phase-resolved',
        changedAt: '2026-07-03T08:00:00.000Z',
        changedBy: { id: 'u1', name: 'IT' },
      },
    ],
  } as Pick<BugReportDetail, 'phaseId' | 'updatedAt' | 'statusHistory'>;

  it('uses first resolved status history entry', () => {
    const ts = resolveBugResolvedTimestamp(detail as BugReportDetail, (id) => id === 'phase-resolved');
    expect(ts).toBe('2026-07-03T08:00:00.000Z');
  });
});

describe('export and stats query schemas', () => {
  it('parses export query', () => {
    expect(BugReportExportQuerySchema.parse({ raisedFrom: '2026-01-01' }).raisedFrom).toBe('2026-01-01');
  });

  it('parses stats query', () => {
    expect(BugReportStatsQuerySchema.parse({}).raisedFrom).toBeUndefined();
  });

  it('parses full stats response', () => {
    const parsed = BugReportStatsResponseSchema.parse({
      totalRaised: 14,
      totalOpen: 10,
      totalSolved: 4,
      unassigned: 2,
      criticalOpen: 1,
      overdue: 0,
      bySeverity: { low: 3, medium: 5, high: 4, critical: 2 },
      byPhase: [{ phaseId: 'p1', label: 'New', count: 5, isResolvedState: false }],
      byModule: [{ module: 'Dashboard', count: 7 }],
      byAssignee: [{ assigneeId: null, name: 'Unassigned', count: 2 }],
      resolvedInRange: 3,
      avgResolutionHours: 48.5,
      medianResolutionHours: 36,
      withVideo: 1,
      withScreenshot: 4,
      withAttachments: 2,
      totalComments: 8,
      bugsWithComments: 5,
      uniqueReporters: 6,
      topReporters: [{ reporterId: 'u1', name: 'Alice', count: 4 }],
    });
    expect(parsed.totalRaised).toBe(14);
    expect(parsed.bySeverity.critical).toBe(2);
  });
});

vi.mock('../src/models/BugReport.js', () => ({
  BugReportModel: {
    aggregate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../src/models/BugReportComment.js', () => ({
  BugReportCommentModel: { aggregate: vi.fn() },
}));

vi.mock('../src/models/BugPhase.js', () => ({
  BugPhaseModel: { find: vi.fn() },
}));

vi.mock('../src/models/User.js', () => ({
  UserModel: { find: vi.fn() },
}));

vi.mock('../src/services/bugPhase.service.js', () => ({
  loadPhaseMap: vi.fn(),
}));

import { BugReportModel } from '../src/models/BugReport.js';
import { BugReportCommentModel } from '../src/models/BugReportComment.js';
import { BugPhaseModel } from '../src/models/BugPhase.js';
import { UserModel } from '../src/models/User.js';
import { loadPhaseMap } from '../src/services/bugPhase.service.js';
import { getBugReportStats } from '../src/services/bugReportStats.service.js';
import { Types } from 'mongoose';

describe('getBugReportStats service', () => {
  const resolvedId = new Types.ObjectId();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadPhaseMap).mockResolvedValue(
      new Map([
        [
          String(resolvedId),
          {
            id: String(resolvedId),
            label: 'Developed',
            legacyKey: 'resolved',
            isResolvedState: true,
          },
        ],
      ])
    );
    vi.mocked(BugReportModel.aggregate).mockResolvedValue([
      {
        totalRaised: [{ n: 10 }],
        totalOpen: [{ n: 6 }],
        totalSolved: [{ n: 4 }],
        unassigned: [{ n: 2 }],
        criticalOpen: [{ n: 1 }],
        overdue: [{ n: 0 }],
        bySeverity: [{ _id: 'high', count: 3 }],
        byPhase: [{ _id: resolvedId, count: 4 }],
        byModule: [{ _id: 'Dashboard', count: 5 }],
        withVideo: [{ n: 1 }],
        withScreenshot: [{ n: 2 }],
        withAttachments: [{ n: 3 }],
        uniqueReporters: [{ _id: new Types.ObjectId(), count: 1 }],
      },
    ]);
    vi.mocked(BugReportModel.countDocuments).mockResolvedValue(2);
    vi.mocked(BugReportCommentModel.aggregate).mockResolvedValue([
      { totalComments: [{ n: 7 }], bugsWithComments: [{ n: 4 }] },
    ]);
    vi.mocked(BugPhaseModel.find).mockReturnValue({
      sort: () => ({
        lean: async () => [
          { _id: resolvedId, label: 'Developed', isResolvedState: true, order: 1 },
        ],
      }),
    } as never);
    vi.mocked(UserModel.find).mockReturnValue({
      select: () => ({
        lean: async () => [],
      }),
    } as never);
  });

  it('returns aggregated stats payload', async () => {
    vi.mocked(BugReportModel.aggregate)
      .mockResolvedValueOnce([
        {
          totalRaised: [{ n: 10 }],
          totalOpen: [{ n: 6 }],
          totalSolved: [{ n: 4 }],
          unassigned: [{ n: 2 }],
          criticalOpen: [{ n: 1 }],
          overdue: [{ n: 0 }],
          bySeverity: [{ _id: 'high', count: 3 }],
          byPhase: [{ _id: resolvedId, count: 4 }],
          byModule: [{ _id: 'Dashboard', count: 5 }],
          withVideo: [{ n: 1 }],
          withScreenshot: [{ n: 2 }],
          withAttachments: [{ n: 3 }],
          uniqueReporters: [{ _id: new Types.ObjectId(), count: 1 }],
        },
      ])
      .mockResolvedValueOnce([{ resolutionHours: 24 }, { resolutionHours: 48 }])
      .mockResolvedValueOnce([{ _id: new Types.ObjectId(), count: 4 }])
      .mockResolvedValueOnce([{ _id: null, count: 2 }]);

    const stats = await getBugReportStats({});
    expect(stats.totalRaised).toBe(10);
    expect(stats.totalSolved).toBe(4);
    expect(stats.bySeverity.high).toBe(3);
    expect(stats.resolvedInRange).toBe(2);
    expect(stats.avgResolutionHours).toBe(36);
    expect(stats.medianResolutionHours).toBe(36);
    expect(stats.totalComments).toBe(7);
    expect(stats.byPhase[0]?.label).toBe('Developed');
  });
});
