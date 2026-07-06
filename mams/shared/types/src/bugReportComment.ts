import { z } from 'zod';

export const BugReportCommentAttachmentSchema = z.object({
  id: z.string(),
  filePath: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number().int().min(0),
});

export type BugReportCommentAttachment = z.infer<typeof BugReportCommentAttachmentSchema>;

export const BugReportCommentAuthorSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

export type BugReportCommentAuthor = z.infer<typeof BugReportCommentAuthorSchema>;

export const BugReportCommentSchema = z.object({
  id: z.string(),
  bugReportId: z.string(),
  author: BugReportCommentAuthorSchema,
  body: z.string(),
  mentionUserIds: z.array(z.string()),
  parentId: z.string().nullable(),
  attachments: z.array(BugReportCommentAttachmentSchema),
  createdAt: z.string(),
});

export type BugReportComment = z.infer<typeof BugReportCommentSchema>;

export const BugReportCommentCreateBodySchema = z.object({
  body: z.string().trim().min(1).max(4000),
  parentId: z.string().optional(),
  mentionUserIds: z.array(z.string()).max(20).optional(),
});

export type BugReportCommentCreateBody = z.infer<typeof BugReportCommentCreateBodySchema>;

export const MAX_BUG_REPORT_COMMENT_IMAGE_BYTES = 5 * 1024 * 1024;

export const BUG_REPORT_COMMENT_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;
