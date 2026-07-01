import { Types } from 'mongoose';
import {
  BugReportCreateBodySchema,
  BugReportListQuerySchema,
  BugReportPatchBodySchema,
  type BugReportCreateBody,
  type BugReportDetail,
  type BugReportListQuery,
  type BugReportListResponse,
  type BugReportPatchBody,
} from '@mams/types';
import { BugReportModel } from '../models/BugReport.js';
import { UserModel } from '../models/User.js';
import type { BugReportDoc } from '../models/BugReport.js';
import { ApiError } from '../middleware/error.js';

const MAX_SCREENSHOT_BYTES = 1_500_000;

function parseScreenshot(base64?: string): { mimeType: string; data: Buffer } | null {
  if (!base64) return null;
  const buf = Buffer.from(base64, 'base64');
  if (buf.length > MAX_SCREENSHOT_BYTES) {
    throw new ApiError(400, 'validation_error', 'Screenshot exceeds maximum size (1.5MB)');
  }
  return { mimeType: 'image/jpeg', data: buf };
}

function bufferFromMongoData(data: unknown): Buffer | null {
  if (!data) return null;
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  if (typeof data === 'object' && data !== null) {
    const record = data as { _bsontype?: string; buffer?: Uint8Array; value?: (raw?: boolean) => Buffer };
    if (record._bsontype === 'Binary' && typeof record.value === 'function') {
      return record.value(true);
    }
    if (record.buffer) return Buffer.from(record.buffer);
    if (Array.isArray((data as { data?: number[] }).data)) {
      return Buffer.from((data as { data: number[] }).data);
    }
  }
  try {
    return Buffer.from(data as ArrayBuffer);
  } catch {
    return null;
  }
}

export function toScreenshotDataUrl(mimeType: string | null | undefined, data: unknown): string | null {
  if (!mimeType) return null;
  const buf = bufferFromMongoData(data);
  if (!buf?.length) return null;
  return `data:${mimeType};base64,${buf.toString('base64')}`;
}

async function loadUserMap(ids: Types.ObjectId[]): Promise<Map<string, { id: string; name: string; email: string; role: string }>> {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  const map = new Map<string, { id: string; name: string; email: string; role: string }>();
  if (unique.length === 0) return map;
  const users = await UserModel.find({ _id: { $in: unique } }).select('name email role').lean();
  for (const u of users) {
    map.set(String(u._id), {
      id: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role,
    });
  }
  return map;
}

function serializeListItem(
  doc: BugReportDoc | (BugReportDoc & { createdAt: Date; updatedAt: Date }),
  userMap: Map<string, { id: string; name: string; email: string; role: string }>
) {
  if (!doc) throw new ApiError(404, 'not_found', 'Bug report not found');
  const reporter = userMap.get(String(doc.reporterId));
  const assignee = doc.assigneeId ? userMap.get(String(doc.assigneeId)) : null;
  return {
    id: String(doc._id),
    title: doc.title,
    description: doc.description,
    severity: doc.severity,
    status: doc.status,
    module: doc.module,
    route: doc.route,
    reporter: reporter ?? {
      id: String(doc.reporterId),
      name: 'Unknown',
      email: '',
      role: '',
    },
    assignee: assignee
      ? { id: assignee.id, name: assignee.name, email: assignee.email }
      : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function createBugReport(reporterId: string, body: BugReportCreateBody) {
  const parsed = BugReportCreateBodySchema.parse(body);
  const screenshot = parseScreenshot(parsed.screenshotBase64);
  const doc = await BugReportModel.create({
    reporterId: new Types.ObjectId(reporterId),
    title: parsed.title,
    description: parsed.description,
    severity: parsed.severity,
    status: 'new',
    module: parsed.context.module,
    route: parsed.context.route,
    context: parsed.context,
    consoleLog: parsed.consoleLog,
    breadcrumbs: parsed.breadcrumbs,
    failedRequests: parsed.failedRequests,
    ...(screenshot ? { screenshot } : {}),
  });
  return { id: String(doc._id) };
}

export async function listBugReports(query: BugReportListQuery): Promise<BugReportListResponse> {
  const q = BugReportListQuerySchema.parse(query);
  const filter: Record<string, unknown> = {};
  if (q.module) filter.module = q.module;
  if (q.severity) filter.severity = q.severity;
  if (q.status) filter.status = q.status;
  if (q.reporterId && Types.ObjectId.isValid(q.reporterId)) {
    filter.reporterId = new Types.ObjectId(q.reporterId);
  }
  if (q.search?.trim()) {
    filter.title = { $regex: q.search.trim(), $options: 'i' };
  }

  const sortField = q.sortBy === 'title' ? 'title' : q.sortBy;
  const sortDir = q.sortDir === 'asc' ? 1 : -1;

  const [total, rows] = await Promise.all([
    BugReportModel.countDocuments(filter),
    BugReportModel.find(filter)
      .sort({ [sortField]: sortDir })
      .skip((q.page - 1) * q.pageSize)
      .limit(q.pageSize)
      .lean(),
  ]);

  const userIds = rows.flatMap((r) => [r.reporterId, r.assigneeId].filter(Boolean) as Types.ObjectId[]);
  const userMap = await loadUserMap(userIds);

  return {
    items: rows.map((r) => serializeListItem(r as BugReportDoc & { createdAt: Date; updatedAt: Date }, userMap)),
    total,
    page: q.page,
    pageSize: q.pageSize,
  };
}

export async function getBugReportDetail(id: string): Promise<BugReportDetail> {
  if (!Types.ObjectId.isValid(id)) throw new ApiError(404, 'not_found', 'Bug report not found');
  const doc = await BugReportModel.findById(id).lean();
  if (!doc) throw new ApiError(404, 'not_found', 'Bug report not found');

  const userMap = await loadUserMap(
    [doc.reporterId, doc.assigneeId].filter(Boolean) as Types.ObjectId[]
  );
  const base = serializeListItem(doc as BugReportDoc & { createdAt: Date; updatedAt: Date }, userMap);

  return {
    ...base,
    consoleLog: (doc.consoleLog ?? []) as BugReportDetail['consoleLog'],
    breadcrumbs: (doc.breadcrumbs ?? []) as BugReportDetail['breadcrumbs'],
    failedRequests: (doc.failedRequests ?? []) as BugReportDetail['failedRequests'],
    context: (doc.context ?? {}) as BugReportDetail['context'],
    screenshotDataUrl: toScreenshotDataUrl(doc.screenshot?.mimeType, doc.screenshot?.data),
  };
}

export async function patchBugReport(id: string, body: BugReportPatchBody) {
  if (!Types.ObjectId.isValid(id)) throw new ApiError(404, 'not_found', 'Bug report not found');
  const parsed = BugReportPatchBodySchema.parse(body);
  const doc = await BugReportModel.findById(id);
  if (!doc) throw new ApiError(404, 'not_found', 'Bug report not found');

  if (parsed.status !== undefined) doc.status = parsed.status;
  if (parsed.assigneeId !== undefined) {
    if (parsed.assigneeId && !Types.ObjectId.isValid(parsed.assigneeId)) {
      throw new ApiError(400, 'validation_error', 'Invalid assignee id');
    }
    doc.assigneeId = parsed.assigneeId ? new Types.ObjectId(parsed.assigneeId) : null;
  }
  await doc.save();
  return getBugReportDetail(id);
}

export async function listBugReportModules(): Promise<string[]> {
  const rows = await BugReportModel.distinct('module');
  return rows.sort();
}
