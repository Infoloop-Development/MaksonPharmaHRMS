import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { ApiError } from '../src/middleware/error.js';

const reportId = '507f1f77bcf86cd799439011';
const itAdminId = '507f1f77bcf86cd799439012';
const hrAdminId = '507f1f77bcf86cd799439013';

function makeReportDoc() {
  const doc = {
    _id: new Types.ObjectId(reportId),
    publicId: 'BUG-0001',
    title: 'Test bug',
    reporterId: new Types.ObjectId(),
    assigneeId: null as Types.ObjectId | null,
    phaseId: null,
    status: 'new',
    statusHistory: [] as Array<Record<string, unknown>>,
    assignmentHistory: [] as Array<Record<string, unknown>>,
    deadline: null,
    module: 'Test',
    route: '/test',
    description: 'desc',
    severity: 'low',
    consoleLog: [],
    breadcrumbs: [],
    failedRequests: [],
    context: {},
    attachments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    markModified: vi.fn(),
    save: vi.fn(async function save(this: typeof doc) {
      return this;
    }),
    lean: vi.fn(async function lean(this: typeof doc) {
      return { ...this };
    }),
  };
  return doc;
}

let reportDoc = makeReportDoc();

vi.mock('../src/models/BugReport.js', () => ({
  BugReportModel: {
    findById: vi.fn(() => reportDoc),
    findOne: vi.fn(async () => null),
  },
}));

vi.mock('../src/models/User.js', () => ({
  UserModel: {
    findById: vi.fn((id: string) => ({
      select: vi.fn(() => ({
        lean: vi.fn(async () => {
          if (String(id) === itAdminId) {
            return { role: 'it.admin', isActive: true, name: 'IT Admin' };
          }
          if (String(id) === hrAdminId) {
            return { role: 'hr.admin', isActive: true, name: 'HR Admin' };
          }
          return null;
        }),
      })),
    })),
    find: vi.fn(() => ({
      select: vi.fn(() => ({
        lean: vi.fn(async () => []),
      })),
    })),
  },
}));

vi.mock('../src/services/bugPhase.service.js', () => ({
  loadPhaseMap: vi.fn(async () => new Map()),
  getDefaultPhaseId: vi.fn(),
}));

vi.mock('../src/services/notification.service.js', () => ({
  notifyUser: vi.fn(),
  buildBugAssignedNotification: vi.fn(() => ({})),
  buildBugResolvedNotification: vi.fn(() => ({})),
}));

describe('patchBugReport assignee validation', () => {
  beforeEach(() => {
    reportDoc = makeReportDoc();
    vi.mocked(reportDoc.save).mockClear();
  });

  it('rejects non-it.admin assignee', async () => {
    const { patchBugReport } = await import('../src/services/bugReporting.service.js');
    await expect(patchBugReport(reportId, { assigneeId: hrAdminId })).rejects.toMatchObject({
      status: 400,
      code: 'validation_error',
    });
  });

  it('accepts active it.admin assignee', async () => {
    const { patchBugReport } = await import('../src/services/bugReporting.service.js');
    const result = await patchBugReport(reportId, { assigneeId: itAdminId }, itAdminId);
    expect(result).toBeDefined();
    expect(reportDoc.save).toHaveBeenCalled();
    expect(reportDoc.assigneeId).toEqual(new Types.ObjectId(itAdminId));
  });

  it('initializes assignmentHistory when missing on legacy docs', async () => {
    (reportDoc as { assignmentHistory?: unknown }).assignmentHistory = undefined;
    const { patchBugReport } = await import('../src/services/bugReporting.service.js');
    await patchBugReport(reportId, { assigneeId: itAdminId }, itAdminId);
    expect(Array.isArray(reportDoc.assignmentHistory)).toBe(true);
    expect(reportDoc.assignmentHistory).toHaveLength(1);
    expect(reportDoc.save).toHaveBeenCalled();
  });
});
