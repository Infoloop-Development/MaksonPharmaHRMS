import { Types } from 'mongoose';
import { BugReportCommentCreateBodySchema, type BugReportComment } from '@mams/types';
import { BugReportCommentModel } from '../models/BugReportComment.js';
import { BugReportModel } from '../models/BugReport.js';
import { UserModel } from '../models/User.js';
import { ApiError } from '../middleware/error.js';
import {
  saveBugReportCommentImage,
  resolveBugReportMediaPath,
  bugReportVideoExists,
} from './bugReportMedia.storage.js';
import {
  buildBugMentionedNotification,
  notifyUser,
} from './notification.service.js';
import { emailBugMentioned } from './bugNotificationEmail.service.js';
import { resolveBugReportRef } from './bugPublicId.service.js';

async function loadAuthors(ids: Types.ObjectId[]) {
  const users = await UserModel.find({ _id: { $in: ids } })
    .select('name email role')
    .lean();
  return new Map(
    users.map((u) => [String(u._id), { id: String(u._id), name: u.name, email: u.email }])
  );
}

function serializeComment(
  doc: {
    _id: Types.ObjectId;
    bugReportId: Types.ObjectId;
    authorId: Types.ObjectId;
    body: string;
    mentionUserIds?: Types.ObjectId[];
    parentId?: Types.ObjectId | null;
    attachments?: Array<{
      _id?: Types.ObjectId;
      filePath: string;
      originalName: string;
      mimeType: string;
      size: number;
    }>;
    createdAt?: Date;
  },
  authorMap: Map<string, { id: string; name: string; email: string }>
): BugReportComment {
  const author = authorMap.get(String(doc.authorId));
  return {
    id: String(doc._id),
    bugReportId: String(doc.bugReportId),
    author: author ?? { id: String(doc.authorId), name: 'Unknown', email: '' },
    body: doc.body,
    mentionUserIds: (doc.mentionUserIds ?? []).map(String),
    parentId: doc.parentId ? String(doc.parentId) : null,
    attachments: (doc.attachments ?? []).map((a) => ({
      id: String(a._id),
      filePath: a.filePath,
      originalName: a.originalName,
      mimeType: a.mimeType,
      size: a.size,
    })),
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
  };
}

export async function listBugReportComments(reportRef: string): Promise<BugReportComment[]> {
  const reportId = await resolveBugReportRef(reportRef);

  const rows = await BugReportCommentModel.find({ bugReportId: reportId })
    .sort({ createdAt: 1 })
    .lean();
  const authorIds = rows.map((r) => r.authorId);
  const mentionIds = rows.flatMap((r) => r.mentionUserIds ?? []);
  const authorMap = await loadAuthors([...authorIds, ...mentionIds]);

  return rows.map((r) => serializeComment(r, authorMap));
}

export async function createBugReportComment(
  reportRef: string,
  authorUserId: string,
  body: unknown,
  imageFile?: { buffer: Buffer; mimetype: string; size: number; originalname?: string }
): Promise<BugReportComment> {
  const reportId = await resolveBugReportRef(reportRef);
  const parsed = BugReportCommentCreateBodySchema.parse(body);

  const report = await BugReportModel.findById(reportId).select('title').lean();
  if (!report) throw new ApiError(404, 'not_found', 'Bug report not found');

  const author = await UserModel.findById(authorUserId).select('name email role').lean();
  if (!author) throw new ApiError(404, 'not_found', 'Author not found');

  if (parsed.parentId) {
    if (!Types.ObjectId.isValid(parsed.parentId)) {
      throw new ApiError(400, 'validation_error', 'Invalid parent comment id');
    }
    const parent = await BugReportCommentModel.findOne({
      _id: parsed.parentId,
      bugReportId: reportId,
    });
    if (!parent) throw new ApiError(404, 'not_found', 'Parent comment not found');
  }

  const mentionUserIds = (parsed.mentionUserIds ?? []).filter((id) => Types.ObjectId.isValid(id));
  const attachments: Array<{
    filePath: string;
    originalName: string;
    mimeType: string;
    size: number;
  }> = [];

  if (imageFile) {
    const originalName =
      (imageFile.originalname ?? 'image.jpg').replace(/[^\w.\- ()[\]]+/g, '_').slice(0, 200) ||
      'image.jpg';
    const filePath = await saveBugReportCommentImage(
      reportId,
      imageFile.buffer,
      imageFile.mimetype,
      originalName
    );
    attachments.push({
      filePath,
      originalName,
      mimeType: imageFile.mimetype.split(';')[0]?.trim().toLowerCase() || 'image/jpeg',
      size: imageFile.size,
    });
  }

  const doc = await BugReportCommentModel.create({
    bugReportId: new Types.ObjectId(reportId),
    authorId: new Types.ObjectId(authorUserId),
    body: parsed.body,
    mentionUserIds: mentionUserIds.map((id) => new Types.ObjectId(id)),
    parentId: parsed.parentId ? new Types.ObjectId(parsed.parentId) : null,
    attachments,
  });

  for (const userId of mentionUserIds) {
    if (userId === authorUserId) continue;
    const mentioned = await UserModel.findById(userId).select('role').lean();
    if (mentioned?.role !== 'it.admin') continue;
    await notifyUser(
      userId,
      buildBugMentionedNotification({
        title: report.title,
        authorName: author.name,
        entityId: reportId,
      })
    );
    void emailBugMentioned({
      mentionedUserId: userId,
      title: report.title,
      authorName: author.name,
      reportId,
    });
  }

  const authorMap = await loadAuthors([doc.authorId]);
  return serializeComment(doc.toObject(), authorMap);
}

export async function streamBugReportCommentAttachment(
  reportRef: string,
  commentId: string,
  attachmentId: string
): Promise<{ absolutePath: string; mimeType: string; size: number; originalName: string }> {
  const reportId = await resolveBugReportRef(reportRef);
  if (!Types.ObjectId.isValid(commentId)) {
    throw new ApiError(404, 'not_found', 'Attachment not found');
  }
  const comment = await BugReportCommentModel.findOne({
    _id: commentId,
    bugReportId: reportId,
  }).lean();
  if (!comment) throw new ApiError(404, 'not_found', 'Comment not found');

  const attachment = (comment.attachments ?? []).find((a) => String(a._id) === attachmentId);
  if (!attachment?.filePath) throw new ApiError(404, 'not_found', 'Attachment not found');

  const exists = await bugReportVideoExists(attachment.filePath);
  if (!exists) throw new ApiError(404, 'not_found', 'Attachment file missing on disk');

  return {
    absolutePath: resolveBugReportMediaPath(attachment.filePath),
    mimeType: attachment.mimeType,
    size: attachment.size,
    originalName: attachment.originalName,
  };
}
