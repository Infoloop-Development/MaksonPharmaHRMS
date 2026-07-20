import { escapeRegex } from '../utils/escapeRegex.js';
import { Types } from 'mongoose';
import {
  BUG_REPORT_ASSIGNEE_UNASSIGNED,
  BugReportCreateBodySchema,
  BugReportListQuerySchema,
  BugReportPatchBodySchema,
  type BugReportAssignmentHistoryEntry,
  type BugReportAttachment,
  type BugReportCreateBody,
  type BugReportDetail,
  type BugReportListQuery,
  type BugReportListResponse,
  type BugReportPatchBody,
  type BugReportStatusHistoryEntry,
} from '@mams/types';
import { BugReportModel } from '../models/BugReport.js';
import { UserModel } from '../models/User.js';
import type { BugReportDoc } from '../models/BugReport.js';
import { ApiError } from '../middleware/error.js';
import { allocateNextBugPublicId, resolveBugReportRef } from './bugPublicId.service.js';
import { buildBugReportRaisedDateFilter } from './bugReportDateFilter.js';
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
import { getBugReportStats } from './bugReportStats.service.js';
import {
  emailBugAssigned,
  emailBugResolved,
  emailItAdminsNewBugReport,
} from './bugNotificationEmail.service.js';
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

async function loadUserMap(
  ids: Array<Types.ObjectId | string | null | undefined>
): Promise<Map<string, { id: string; name: string; email: string; role: string }>> {
  const unique = [
    ...new Set(
      ids
        .filter(Boolean)
        .map((id) => String(id))
        .filter((id) => Types.ObjectId.isValid(id))
    ),
  ];
  const map = new Map<string, { id: string; name: string; email: string; role: string }>();
  if (unique.length === 0) return map;
  const users = await UserModel.find({
    _id: { $in: unique.map((id) => new Types.ObjectId(id)) },
  })
    .select('name email role')
    .lean();
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
    publicId: doc.publicId ?? '',
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

function serializeStatusHistory(
  doc: {
    statusHistory?: Array<{
      phaseName: string;
      phaseId: Types.ObjectId;
      changedAt: Date;
      changedById: Types.ObjectId;
    }>;
  },
  userMap: Map<string, { id: string; name: string; email: string; role: string }>
): BugReportStatusHistoryEntry[] {
  return (doc.statusHistory ?? []).map((entry) => {
    const changedBy = userMap.get(String(entry.changedById));
    return {
      phaseName: entry.phaseName,
      phaseId: String(entry.phaseId),
      changedAt: new Date(entry.changedAt).toISOString(),
      changedBy: changedBy
        ? { id: changedBy.id, name: changedBy.name }
        : { id: String(entry.changedById), name: 'Unknown' },
    };
  });
}

function serializeAssignmentHistory(
  doc: {
    assignmentHistory?: Array<{
      assignedById: Types.ObjectId;
      assignedToId?: Types.ObjectId | null;
      assignedAt: Date;
      deadline?: Date | null;
    }>;
  },
  userMap: Map<string, { id: string; name: string; email: string; role: string }>
): BugReportAssignmentHistoryEntry[] {
  return (doc.assignmentHistory ?? []).map((entry) => {
    const assignedBy = userMap.get(String(entry.assignedById));
    const assignedTo = entry.assignedToId ? userMap.get(String(entry.assignedToId)) : null;
    return {
      assignedAt: new Date(entry.assignedAt).toISOString(),
      deadline: entry.deadline ? new Date(entry.deadline).toISOString().slice(0, 10) : null,
      assignedBy: assignedBy
        ? { id: assignedBy.id, name: assignedBy.name }
        : { id: String(entry.assignedById), name: 'Unknown' },
      assignedTo: assignedTo
        ? { id: assignedTo.id, name: assignedTo.name }
        : entry.assignedToId
          ? { id: String(entry.assignedToId), name: 'Unknown' }
          : null,
    };
  });
}

export async function createBugReport(reporterId: string, body: BugReportCreateBody) {
  const parsed = BugReportCreateBodySchema.parse(body);
  const screenshot = parseScreenshot(parsed.screenshotBase64);
  const defaultPhaseId = await getDefaultPhaseId();
  const publicId = await allocateNextBugPublicId();
  const doc = await BugReportModel.create({
    publicId,
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

  const reporter = await UserModel.findById(reporterId).select('name').lean();
  void emailItAdminsNewBugReport({
    title: doc.title,
    reporterName: reporter?.name ?? 'A user',
    severity: doc.severity,
    module: doc.module,
    reportId: String(doc._id),
    reporterUserId: reporterId,
  });

  return { id: String(doc._id), publicId: doc.publicId };
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
    filter.title = { $regex: escapeRegex(q.search.trim()), $options: 'i' };
  }
  const raisedDateFilter = buildBugReportRaisedDateFilter(q);
  if (raisedDateFilter) {
    filter.createdAt = raisedDateFilter;
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

export async function getBugReportDetail(
  ref: string,
  options?: { probeVideoAudio?: boolean }
): Promise<BugReportDetail> {
  const id = await resolveBugReportRef(ref);
  const doc = await BugReportModel.findById(id).lean();
  if (!doc) throw new ApiError(404, 'not_found', 'Bug report not found');

  const historyUserIds = [
    doc.reporterId,
    doc.assigneeId,
    ...(doc.statusHistory ?? []).flatMap((e) => [e.changedById]),
    ...(doc.assignmentHistory ?? []).flatMap((e) => [e.assignedById, e.assignedToId]),
  ].filter(Boolean) as Types.ObjectId[];

  const userMap = await loadUserMap(historyUserIds);
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
  // Skip ffprobe on PATCH responses — it can hang tens of seconds and make assign feel broken.
  const probeVideoAudio = options?.probeVideoAudio !== false;
  const videoHasAudio =
    probeVideoAudio && videoAvailableOnDisk && videoFilePath
      ? await videoHasAudioStream(resolveBugReportVideoPath(videoFilePath))
      : false;

  return {
    ...base,
    statusHistory: serializeStatusHistory(doc, userMap),
    assignmentHistory: serializeAssignmentHistory(doc, userMap),
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
  ref: string,
  body: BugReportPatchBody,
  actorUserId?: string
) {
  const id = await resolveBugReportRef(ref);
  const parsed = BugReportPatchBodySchema.parse(body);
  const doc = await BugReportModel.findById(id);
  if (!doc) throw new ApiError(404, 'not_found', 'Bug report not found');

  const phaseMap = await loadPhaseMap();
  const prevPhaseId = doc.phaseId ? String(doc.phaseId) : null;
  const prevAssigneeId = doc.assigneeId ? String(doc.assigneeId) : null;
  const now = new Date();

  if (parsed.phaseId !== undefined) {
    if (!Types.ObjectId.isValid(parsed.phaseId)) {
      throw new ApiError(400, 'validation_error', 'Invalid phase id');
    }
    const phase = phaseMap.get(parsed.phaseId);
    if (!phase) throw new ApiError(404, 'not_found', 'Phase not found');
    const newPhaseId = parsed.phaseId;
    if (newPhaseId !== prevPhaseId) {
      doc.phaseId = new Types.ObjectId(parsed.phaseId);
      if (phase.legacyKey) doc.status = phase.legacyKey as BugReportStatus;
      if (actorUserId && Types.ObjectId.isValid(actorUserId)) {
        if (!Array.isArray(doc.statusHistory)) doc.set('statusHistory', []);
        doc.statusHistory.push({
          phaseName: phase.label,
          phaseId: new Types.ObjectId(parsed.phaseId),
          changedAt: now,
          changedById: new Types.ObjectId(actorUserId),
        });
      }
    }
  } else if (parsed.status !== undefined) {
    const phase = [...phaseMap.values()].find((p) => p.legacyKey === parsed.status);
    const newPhaseId = phase?.id ?? null;
    if (phase && newPhaseId && newPhaseId !== prevPhaseId) {
      doc.status = parsed.status;
      doc.phaseId = new Types.ObjectId(phase.id);
      if (actorUserId && Types.ObjectId.isValid(actorUserId)) {
        if (!Array.isArray(doc.statusHistory)) doc.set('statusHistory', []);
        doc.statusHistory.push({
          phaseName: phase.label,
          phaseId: new Types.ObjectId(phase.id),
          changedAt: now,
          changedById: new Types.ObjectId(actorUserId),
        });
      }
    } else if (!newPhaseId) {
      doc.status = parsed.status;
    }
  }

  if (parsed.assigneeId !== undefined) {
    if (parsed.assigneeId && !Types.ObjectId.isValid(parsed.assigneeId)) {
      throw new ApiError(400, 'validation_error', 'Invalid assignee id');
    }
    if (parsed.assigneeId) {
      const assignee = await UserModel.findById(parsed.assigneeId).select('role isActive').lean();
      if (!assignee?.isActive || assignee.role !== 'it.admin') {
        throw new ApiError(400, 'validation_error', 'Assignee must be an active IT Admin');
      }
    }
    const nextAssigneeId = parsed.assigneeId ? String(parsed.assigneeId) : null;
    if (nextAssigneeId !== prevAssigneeId) {
      doc.assigneeId = parsed.assigneeId ? new Types.ObjectId(parsed.assigneeId) : null;
      if (actorUserId && Types.ObjectId.isValid(actorUserId)) {
        const deadlineSnapshot =
          parsed.deadline !== undefined
            ? parsed.deadline
              ? new Date(`${parsed.deadline}T00:00:00.000Z`)
              : null
            : doc.deadline;
        if (!Array.isArray(doc.assignmentHistory)) doc.set('assignmentHistory', []);
        doc.assignmentHistory.push({
          assignedById: new Types.ObjectId(actorUserId),
          assignedToId: parsed.assigneeId ? new Types.ObjectId(parsed.assigneeId) : null,
          assignedAt: now,
          deadline: deadlineSnapshot,
        });
        doc.markModified('assignmentHistory');
      }
    }
  }

  if (parsed.deadline !== undefined) {
    doc.deadline = parsed.deadline ? new Date(`${parsed.deadline}T00:00:00.000Z`) : null;
  }

  await doc.save();

  const newPhaseId = doc.phaseId ? String(doc.phaseId) : null;
  const newAssigneeId = doc.assigneeId ? String(doc.assigneeId) : null;
  const notifyEntityId = doc.publicId || id;

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
        entityId: notifyEntityId,
      })
    );
    void emailBugResolved({
      reporterUserId: String(doc.reporterId),
      title: doc.title,
      phaseLabel: phase.label,
    });
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
          entityId: notifyEntityId,
        })
      );
      void emailBugAssigned({
        assigneeUserId: newAssigneeId,
        title: doc.title,
        assignerName: actor?.name ?? 'Someone',
        reportId: id,
      });
    }
  }

  // Avoid ffprobe on the PATCH response path so assignee/phase updates stay snappy.
  return getBugReportDetail(id, { probeVideoAudio: false });
}

export { getBugReportStats, resolveBugReportRef };

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

export async function streamBugReportVideo(reportRef: string): Promise<{
  absolutePath: string;
  mimeType: string;
  size: number;
}> {
  const reportId = await resolveBugReportRef(reportRef);
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
  reportRef: string,
  attachmentId: string
): Promise<{
  absolutePath: string;
  mimeType: string;
  size: number;
  originalName: string;
}> {
  const reportId = await resolveBugReportRef(reportRef);
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
