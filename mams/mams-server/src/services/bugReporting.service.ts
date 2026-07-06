import { Types } from 'mongoose';
import {
  BUG_REPORT_ASSIGNEE_UNASSIGNED,
  BugReportCreateBodySchema,
  BugReportListQuerySchema,
  BugReportPatchBodySchema,
  type BugReportAttachment,
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
import {
  deleteBugReportVideo,
  deleteBugReportAttachment,
  saveBugReportVideo,
  saveBugReportAttachment,
  bugReportVideoExists,
  resolveBugReportMediaPath,
  resolveBugReportVideoPath,
  normalizeBugReportVideoMime,
  normalizeBugReportAttachmentMime,
  validateBugReportAttachmentMime,
  validateBugReportAttachmentSize,
  MAX_BUG_REPORT_ATTACHMENTS,
  MAX_BUG_REPORT_ATTACHMENTS_TOTAL_BYTES,
} from './bugReportMedia.storage.js';
import { videoHasAudioStream } from './bugReportMedia.probe.js';
import { getDefaultPhaseId, loadPhaseMap } from './bugPhase.service.js';
import {
  buildBugAssignedNotification,
  buildBugResolvedNotification,
  notifyUser,
} from './notification.service.js';
import type { BugReportStatus } from '@mams/types';

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

function serializeAttachments(doc: { attachments?: Array<{
  _id?: { toString(): string };
  filePath: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: Date | string;
}> }): BugReportAttachment[] {
  return (doc.attachments ?? []).map((a) => ({
    id: String(a._id),
    filePath: a.filePath,
    originalName: a.originalName,
    mimeType: a.mimeType,
    size: a.size,
    uploadedAt: new Date(a.uploadedAt).toISOString(),
  }));
}

function serializeListItem(
  doc: BugReportDoc | (BugReportDoc & { createdAt: Date; updatedAt: Date }),
  userMap: Map<string, { id: string; name: string; email: string; role: string }>,
  phaseMap: Map<string, { id: string; label: string; legacyKey: string | null; isResolvedState: boolean }>
) {
  if (!doc) throw new ApiError(404, 'not_found', 'Bug report not found');
  const reporter = userMap.get(String(doc.reporterId));
  const assignee = doc.assigneeId ? userMap.get(String(doc.assigneeId)) : null;
  const phase = doc.phaseId ? phaseMap.get(String(doc.phaseId)) : undefined;
  const legacyStatus = (phase?.legacyKey ?? doc.status ?? 'new') as BugReportStatus;

  return {
    id: String(doc._id),
    title: doc.title,
    description: doc.description,
    severity: doc.severity,
    status: legacyStatus,
    phaseId: phase?.id ?? (doc.phaseId ? String(doc.phaseId) : ''),
    phaseLabel: phase?.label ?? 'Unknown',
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
    deadline: doc.deadline ? new Date(doc.deadline).toISOString().slice(0, 10) : null,
    hasVideo: Boolean(doc.video?.filePath),
    hasAttachments: (doc.attachments?.length ?? 0) > 0,
    attachmentCount: doc.attachments?.length ?? 0,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function createBugReport(reporterId: string, body: BugReportCreateBody) {
  const parsed = BugReportCreateBodySchema.parse(body);
  const screenshot = parseScreenshot(parsed.screenshotBase64);
  const defaultPhaseId = await getDefaultPhaseId();
  const doc = await BugReportModel.create({
    reporterId: new Types.ObjectId(reporterId),
    title: parsed.title,
    description: parsed.description,
    severity: parsed.severity,
    status: 'new',
    phaseId: defaultPhaseId,
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
  const phaseMap = await loadPhaseMap();
  const filter: Record<string, unknown> = {};
  if (q.module) filter.module = q.module;
  if (q.severity) filter.severity = q.severity;
  if (q.phaseId && Types.ObjectId.isValid(q.phaseId)) {
    filter.phaseId = new Types.ObjectId(q.phaseId);
  } else if (q.status) {
    const phase = [...phaseMap.values()].find((p) => p.legacyKey === q.status);
    if (phase) filter.phaseId = new Types.ObjectId(phase.id);
    else filter.status = q.status;
  }
  if (q.reporterId && Types.ObjectId.isValid(q.reporterId)) {
    filter.reporterId = new Types.ObjectId(q.reporterId);
  }
  if (q.assigneeId === BUG_REPORT_ASSIGNEE_UNASSIGNED) {
    filter.assigneeId = null;
  } else if (q.assigneeId && Types.ObjectId.isValid(q.assigneeId)) {
    filter.assigneeId = new Types.ObjectId(q.assigneeId);
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
    items: rows.map((r) =>
      serializeListItem(r as BugReportDoc & { createdAt: Date; updatedAt: Date }, userMap, phaseMap)
    ),
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
  const phaseMap = await loadPhaseMap();
  const base = serializeListItem(
    doc as BugReportDoc & { createdAt: Date; updatedAt: Date },
    userMap,
    phaseMap
  );

  const videoFilePath = doc.video?.filePath ?? null;
  const videoAvailableOnDisk = videoFilePath
    ? await bugReportVideoExists(videoFilePath)
    : false;
  const videoHasAudio =
    videoAvailableOnDisk && videoFilePath
      ? await videoHasAudioStream(resolveBugReportVideoPath(videoFilePath))
      : false;

  return {
    ...base,
    consoleLog: (doc.consoleLog ?? []) as BugReportDetail['consoleLog'],
    breadcrumbs: (doc.breadcrumbs ?? []) as BugReportDetail['breadcrumbs'],
    failedRequests: (doc.failedRequests ?? []) as BugReportDetail['failedRequests'],
    context: (doc.context ?? {}) as BugReportDetail['context'],
    screenshotDataUrl: toScreenshotDataUrl(doc.screenshot?.mimeType, doc.screenshot?.data),
    videoUrl: videoFilePath ? `/admin/bug-reporting/${id}/video` : null,
    videoFilePath,
    videoAvailableOnDisk,
    videoHasAudio,
    transcriptionText: doc.transcriptionText ?? null,
    detectedLanguage: (doc.detectedLanguage as BugReportDetail['detectedLanguage']) ?? null,
    transcriptionStatus: (doc.transcriptionStatus as BugReportDetail['transcriptionStatus']) ?? null,
    transcriptionError: doc.transcriptionError ?? null,
    transcriptionConfidence: doc.transcriptionConfidence ?? null,
    transcriptionGeneratedAt: doc.transcriptionGeneratedAt
      ? new Date(doc.transcriptionGeneratedAt).toISOString()
      : null,
    attachments: serializeAttachments(doc),
  };
}

export async function patchBugReport(
  id: string,
  body: BugReportPatchBody,
  actorUserId?: string
) {
  if (!Types.ObjectId.isValid(id)) throw new ApiError(404, 'not_found', 'Bug report not found');
  const parsed = BugReportPatchBodySchema.parse(body);
  const doc = await BugReportModel.findById(id);
  if (!doc) throw new ApiError(404, 'not_found', 'Bug report not found');

  const phaseMap = await loadPhaseMap();
  const prevPhaseId = doc.phaseId ? String(doc.phaseId) : null;
  const prevAssigneeId = doc.assigneeId ? String(doc.assigneeId) : null;

  if (parsed.phaseId !== undefined) {
    if (!Types.ObjectId.isValid(parsed.phaseId)) {
      throw new ApiError(400, 'validation_error', 'Invalid phase id');
    }
    const phase = phaseMap.get(parsed.phaseId);
    if (!phase) throw new ApiError(404, 'not_found', 'Phase not found');
    doc.phaseId = new Types.ObjectId(parsed.phaseId);
    if (phase.legacyKey) doc.status = phase.legacyKey as BugReportStatus;
  } else if (parsed.status !== undefined) {
    doc.status = parsed.status;
    const phase = [...phaseMap.values()].find((p) => p.legacyKey === parsed.status);
    if (phase) doc.phaseId = new Types.ObjectId(phase.id);
  }

  if (parsed.assigneeId !== undefined) {
    if (parsed.assigneeId && !Types.ObjectId.isValid(parsed.assigneeId)) {
      throw new ApiError(400, 'validation_error', 'Invalid assignee id');
    }
    doc.assigneeId = parsed.assigneeId ? new Types.ObjectId(parsed.assigneeId) : null;
  }

  if (parsed.deadline !== undefined) {
    doc.deadline = parsed.deadline ? new Date(`${parsed.deadline}T00:00:00.000Z`) : null;
  }

  await doc.save();

  const newPhaseId = doc.phaseId ? String(doc.phaseId) : null;
  const newAssigneeId = doc.assigneeId ? String(doc.assigneeId) : null;

  if (
    newPhaseId &&
    newPhaseId !== prevPhaseId &&
    phaseMap.get(newPhaseId)?.isResolvedState
  ) {
    const phase = phaseMap.get(newPhaseId)!;
    await notifyUser(
      String(doc.reporterId),
      buildBugResolvedNotification({
        title: doc.title,
        phaseLabel: phase.label,
        entityId: id,
      })
    );
  }

  if (
    newAssigneeId &&
    newAssigneeId !== prevAssigneeId &&
    newAssigneeId !== actorUserId
  ) {
    const assignee = await UserModel.findById(newAssigneeId).select('role name').lean();
    if (assignee?.role === 'it.admin') {
      const actor = actorUserId
        ? await UserModel.findById(actorUserId).select('name').lean()
        : null;
      await notifyUser(
        newAssigneeId,
        buildBugAssignedNotification({
          title: doc.title,
          assignerName: actor?.name ?? 'Someone',
          entityId: id,
        })
      );
    }
  }

  return getBugReportDetail(id);
}

export async function listBugReportModules(): Promise<string[]> {
  const rows = await BugReportModel.distinct('module');
  return rows.sort();
}

export async function attachBugReportVideo(
  reportId: string,
  userId: string,
  permissions: string[],
  file: { buffer: Buffer; mimetype: string; size: number; originalname?: string },
  durationMs?: number
): Promise<void> {
  if (!Types.ObjectId.isValid(reportId)) {
    throw new ApiError(404, 'not_found', 'Bug report not found');
  }

  const doc = await BugReportModel.findById(reportId);
  if (!doc) throw new ApiError(404, 'not_found', 'Bug report not found');

  const isReporter = String(doc.reporterId) === userId;
  const canManage = permissions.includes('manage.bug_reports');
  if (!isReporter && !canManage) {
    throw new ApiError(403, 'forbidden', 'Not allowed to upload video for this report');
  }
  if (doc.video?.filePath) {
    throw new ApiError(409, 'conflict', 'This bug report already has a video');
  }

  let relativePath: string | null = null;
  try {
    relativePath = await saveBugReportVideo(
      reportId,
      file.buffer,
      file.mimetype,
      file.originalname
    );
    const normalizedMime = normalizeBugReportVideoMime(file.mimetype, file.originalname);
    doc.video = {
      filePath: relativePath,
      mimeType: normalizedMime,
      size: file.size,
      durationMs: durationMs ?? null,
    };
    await doc.save();
  } catch (err) {
    if (relativePath) await deleteBugReportVideo(relativePath);
    throw err;
  }
}

export async function streamBugReportVideo(reportId: string): Promise<{
  absolutePath: string;
  mimeType: string;
  size: number;
}> {
  if (!Types.ObjectId.isValid(reportId)) {
    throw new ApiError(404, 'not_found', 'Bug report not found');
  }
  const doc = await BugReportModel.findById(reportId).select('video').lean();
  if (!doc?.video?.filePath) {
    throw new ApiError(404, 'not_found', 'Video not found');
  }

  const exists = await bugReportVideoExists(doc.video.filePath);
  if (!exists) {
    throw new ApiError(404, 'not_found', 'Video file missing on disk');
  }

  return {
    absolutePath: resolveBugReportVideoPath(doc.video.filePath),
    mimeType: doc.video.mimeType ?? 'video/webm',
    size: doc.video.size ?? 0,
  };
}

export async function attachBugReportFiles(
  reportId: string,
  userId: string,
  permissions: string[],
  files: Array<{ buffer: Buffer; mimetype: string; size: number; originalname?: string }>
): Promise<void> {
  if (!Types.ObjectId.isValid(reportId)) {
    throw new ApiError(404, 'not_found', 'Bug report not found');
  }
  if (!files.length) {
    throw new ApiError(400, 'validation_error', 'No files uploaded');
  }

  const doc = await BugReportModel.findById(reportId);
  if (!doc) throw new ApiError(404, 'not_found', 'Bug report not found');

  const isReporter = String(doc.reporterId) === userId;
  const canManage = permissions.includes('manage.bug_reports');
  if (!isReporter && !canManage) {
    throw new ApiError(403, 'forbidden', 'Not allowed to upload files for this report');
  }

  const existingCount = doc.attachments?.length ?? 0;
  if (existingCount + files.length > MAX_BUG_REPORT_ATTACHMENTS) {
    throw new ApiError(
      400,
      'validation_error',
      `Maximum ${MAX_BUG_REPORT_ATTACHMENTS} attachments per bug report`
    );
  }

  const existingBytes = (doc.attachments ?? []).reduce((sum, a) => sum + (a.size ?? 0), 0);
  const incomingBytes = files.reduce((sum, f) => sum + f.size, 0);
  if (existingBytes + incomingBytes > MAX_BUG_REPORT_ATTACHMENTS_TOTAL_BYTES) {
    throw new ApiError(400, 'file_too_large', 'Total attachment size exceeds 30MB per bug report');
  }

  const savedPaths: string[] = [];
  const newEntries: Array<{
    filePath: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedAt: Date;
  }> = [];
  try {
    for (const file of files) {
      validateBugReportAttachmentMime(file.mimetype, file.originalname);
      validateBugReportAttachmentSize(file.size);
      const originalName = (file.originalname ?? 'attachment').replace(/[^\w.\- ()[\]]+/g, '_').slice(0, 200) || 'attachment';
      const relativePath = await saveBugReportAttachment(
        reportId,
        file.buffer,
        file.mimetype,
        originalName
      );
      savedPaths.push(relativePath);
      const normalizedMime = normalizeBugReportAttachmentMime(file.mimetype, file.originalname);
      newEntries.push({
        filePath: relativePath,
        originalName,
        mimeType: normalizedMime,
        size: file.size,
        uploadedAt: new Date(),
      });
    }
    doc.attachments.push(...newEntries);
    await doc.save();
  } catch (err) {
    for (const p of savedPaths) await deleteBugReportAttachment(p);
    throw err;
  }
}

export async function streamBugReportAttachment(
  reportId: string,
  attachmentId: string
): Promise<{
  absolutePath: string;
  mimeType: string;
  size: number;
  originalName: string;
}> {
  if (!Types.ObjectId.isValid(reportId)) {
    throw new ApiError(404, 'not_found', 'Bug report not found');
  }
  const doc = await BugReportModel.findById(reportId).select('attachments').lean();
  if (!doc) throw new ApiError(404, 'not_found', 'Bug report not found');

  const attachment = (doc.attachments ?? []).find((a) => String(a._id) === attachmentId);
  if (!attachment?.filePath) {
    throw new ApiError(404, 'not_found', 'Attachment not found');
  }

  const exists = await bugReportVideoExists(attachment.filePath);
  if (!exists) {
    throw new ApiError(404, 'not_found', 'Attachment file missing on disk');
  }

  return {
    absolutePath: resolveBugReportMediaPath(attachment.filePath),
    mimeType: attachment.mimeType ?? 'application/octet-stream',
    size: attachment.size ?? 0,
    originalName: attachment.originalName ?? 'attachment',
  };
}
