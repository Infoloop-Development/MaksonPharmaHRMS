import { z } from 'zod';

export const BugReportSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type BugReportSeverity = z.infer<typeof BugReportSeveritySchema>;

export const BugReportStatusSchema = z.enum([
  'new',
  'acknowledged',
  'in_progress',
  'resolved',
  'closed',
]);
export type BugReportStatus = z.infer<typeof BugReportStatusSchema>;

export const BUG_REPORT_SEVERITY_LABELS: Record<BugReportSeverity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const BUG_REPORT_STATUS_LABELS: Record<BugReportStatus, string> = {
  new: 'New',
  acknowledged: 'Acknowledged',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

/** Kanban board column labels mapped to existing status values (display only). */
export const BUG_REPORT_KANBAN_COLUMNS: ReadonlyArray<{ status: BugReportStatus; label: string }> = [
  { status: 'new', label: 'Raised' },
  { status: 'acknowledged', label: 'Acknowledged' },
  { status: 'in_progress', label: 'Under Development' },
  { status: 'resolved', label: 'Developed' },
  { status: 'closed', label: 'Pushed to Live' },
];

export const BUG_REPORT_ASSIGNEE_UNASSIGNED = 'unassigned' as const;

/** Human-readable bug id format, e.g. BUG-1024 */
export const BUG_PUBLIC_ID_PATTERN = /^BUG-\d+$/;

export function isBugPublicId(ref: string): boolean {
  return BUG_PUBLIC_ID_PATTERN.test(ref);
}

export const BugReportStatusHistoryEntrySchema = z.object({
  phaseName: z.string(),
  phaseId: z.string(),
  changedAt: z.string(),
  changedBy: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

export type BugReportStatusHistoryEntry = z.infer<typeof BugReportStatusHistoryEntrySchema>;

export const BugReportAssignmentHistoryEntrySchema = z.object({
  assignedAt: z.string(),
  deadline: z.string().nullable(),
  assignedBy: z.object({
    id: z.string(),
    name: z.string(),
  }),
  assignedTo: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable(),
});

export type BugReportAssignmentHistoryEntry = z.infer<typeof BugReportAssignmentHistoryEntrySchema>;

export const BugReportStatsQuerySchema = z.object({
  raisedFrom: z.string().date().optional(),
  raisedTo: z.string().date().optional(),
});

export type BugReportStatsQuery = z.infer<typeof BugReportStatsQuerySchema>;

export const BugReportStatsSeverityBreakdownSchema = z.object({
  low: z.number().int().min(0),
  medium: z.number().int().min(0),
  high: z.number().int().min(0),
  critical: z.number().int().min(0),
});

export type BugReportStatsSeverityBreakdown = z.infer<typeof BugReportStatsSeverityBreakdownSchema>;

export const BugReportStatsPhaseRowSchema = z.object({
  phaseId: z.string(),
  label: z.string(),
  count: z.number().int().min(0),
  isResolvedState: z.boolean(),
});

export type BugReportStatsPhaseRow = z.infer<typeof BugReportStatsPhaseRowSchema>;

export const BugReportStatsModuleRowSchema = z.object({
  module: z.string(),
  count: z.number().int().min(0),
});

export type BugReportStatsModuleRow = z.infer<typeof BugReportStatsModuleRowSchema>;

export const BugReportStatsAssigneeRowSchema = z.object({
  assigneeId: z.string().nullable(),
  name: z.string(),
  count: z.number().int().min(0),
});

export type BugReportStatsAssigneeRow = z.infer<typeof BugReportStatsAssigneeRowSchema>;

export const BugReportStatsReporterRowSchema = z.object({
  reporterId: z.string(),
  name: z.string(),
  count: z.number().int().min(0),
});

export type BugReportStatsReporterRow = z.infer<typeof BugReportStatsReporterRowSchema>;

export const BugReportStatsResponseSchema = z.object({
  totalRaised: z.number().int().min(0),
  totalOpen: z.number().int().min(0),
  totalSolved: z.number().int().min(0),
  unassigned: z.number().int().min(0),
  criticalOpen: z.number().int().min(0),
  overdue: z.number().int().min(0),
  bySeverity: BugReportStatsSeverityBreakdownSchema,
  byPhase: z.array(BugReportStatsPhaseRowSchema),
  byModule: z.array(BugReportStatsModuleRowSchema),
  byAssignee: z.array(BugReportStatsAssigneeRowSchema),
  resolvedInRange: z.number().int().min(0),
  avgResolutionHours: z.number().min(0).nullable(),
  medianResolutionHours: z.number().min(0).nullable(),
  withVideo: z.number().int().min(0),
  withScreenshot: z.number().int().min(0),
  withAttachments: z.number().int().min(0),
  totalComments: z.number().int().min(0),
  bugsWithComments: z.number().int().min(0),
  uniqueReporters: z.number().int().min(0),
  topReporters: z.array(BugReportStatsReporterRowSchema),
});

export type BugReportStatsResponse = z.infer<typeof BugReportStatsResponseSchema>;

export const BugReportExportQuerySchema = z.object({
  raisedFrom: z.string().date().optional(),
  raisedTo: z.string().date().optional(),
});

export type BugReportExportQuery = z.infer<typeof BugReportExportQuerySchema>;

export const BugReportAttachmentSchema = z.object({
  id: z.string(),
  filePath: z.string().max(500),
  originalName: z.string().max(255),
  mimeType: z.string().max(100),
  size: z.number().int().min(0),
  uploadedAt: z.string(),
});

export type BugReportAttachment = z.infer<typeof BugReportAttachmentSchema>;

export const MAX_BUG_REPORT_ATTACHMENTS = 5;
export const MAX_BUG_REPORT_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_BUG_REPORT_ATTACHMENTS_TOTAL_BYTES = 30 * 1024 * 1024;

export const BUG_REPORT_ATTACHMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
] as const;

export const BugReportConsoleEntrySchema = z.object({
  level: z.enum(['log', 'warn', 'error']),
  message: z.string().max(2000),
  ts: z.string(),
});

export const BugReportBreadcrumbSchema = z.object({
  action: z.string().max(200),
  ts: z.string(),
});

export const BugReportFailedRequestSchema = z.object({
  method: z.string().max(10),
  path: z.string().max(500),
  status: z.number().int(),
  body: z.string().max(4000).optional(),
  ts: z.string(),
});

export const BugReportContextSchema = z.object({
  route: z.string().max(500),
  module: z.string().max(120),
  role: z.string().max(50),
  browser: z.string().max(200),
  os: z.string().max(120),
  viewport: z.string().max(50),
  sessionDurationMs: z.number().int().min(0),
  appVersion: z.string().max(50).optional(),
});

export const BugReportVideoSchema = z.object({
  filePath: z.string().max(500),
  mimeType: z.string().max(100),
  size: z.number().int().min(0),
  durationMs: z.number().int().min(0).optional(),
});

export type BugReportVideo = z.infer<typeof BugReportVideoSchema>;

export const BugReportTranscriptionStatusSchema = z.enum(['processing', 'completed', 'failed']);
export type BugReportTranscriptionStatus = z.infer<typeof BugReportTranscriptionStatusSchema>;

export const BugReportDetectedLanguageSchema = z.enum(['en', 'hi', 'gu']);
export type BugReportDetectedLanguage = z.infer<typeof BugReportDetectedLanguageSchema>;

export const BUG_REPORT_DETECTED_LANGUAGE_LABELS: Record<BugReportDetectedLanguage, string> = {
  en: 'English',
  hi: 'Hindi',
  gu: 'Gujarati',
};

export const BugReportCreateBodySchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(8000),
  severity: BugReportSeveritySchema,
  screenshotBase64: z.string().max(2_500_000).optional(),
  consoleLog: z.array(BugReportConsoleEntrySchema).max(100),
  breadcrumbs: z.array(BugReportBreadcrumbSchema).max(200),
  failedRequests: z.array(BugReportFailedRequestSchema).max(50),
  context: BugReportContextSchema,
});

export type BugReportCreateBody = z.infer<typeof BugReportCreateBodySchema>;

export const BugReportListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  module: z.string().max(120).optional(),
  severity: BugReportSeveritySchema.optional(),
  /** @deprecated use phaseId */
  status: BugReportStatusSchema.optional(),
  phaseId: z.string().optional(),
  reporterId: z.string().optional(),
  /** User id or `unassigned` to filter reports with no assignee. */
  assigneeId: z.string().max(64).optional(),
  search: z.string().max(200).optional(),
  raisedFrom: z.string().date().optional(),
  raisedTo: z.string().date().optional(),
  sortBy: z.enum(['createdAt', 'severity', 'status', 'module', 'title']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export type BugReportListQuery = z.infer<typeof BugReportListQuerySchema>;

export const BugReportPatchBodySchema = z
  .object({
    /** @deprecated use phaseId */
    status: BugReportStatusSchema.optional(),
    phaseId: z.string().optional(),
    assigneeId: z.string().nullable().optional(),
    deadline: z.string().date().nullable().optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.status !== undefined ||
      v.phaseId !== undefined ||
      v.assigneeId !== undefined ||
      v.deadline !== undefined,
    { message: 'Provide status, phaseId, assigneeId, or deadline' }
  );

export type BugReportPatchBody = z.infer<typeof BugReportPatchBodySchema>;

export interface BugReportReporter {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface BugReportAssignee {
  id: string;
  name: string;
  email: string;
}

export interface BugReportListItem {
  id: string;
  publicId: string;
  title: string;
  description: string;
  severity: BugReportSeverity;
  /** @deprecated derived from phase legacyKey when present */
  status: BugReportStatus;
  phaseId: string;
  phaseLabel: string;
  module: string;
  route: string;
  reporter: BugReportReporter;
  assignee: BugReportAssignee | null;
  deadline: string | null;
  hasVideo: boolean;
  hasAttachments: boolean;
  attachmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BugReportListResponse {
  items: BugReportListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BugReportDetail extends BugReportListItem {
  statusHistory: BugReportStatusHistoryEntry[];
  assignmentHistory: BugReportAssignmentHistoryEntry[];
  consoleLog: z.infer<typeof BugReportConsoleEntrySchema>[];
  breadcrumbs: z.infer<typeof BugReportBreadcrumbSchema>[];
  failedRequests: z.infer<typeof BugReportFailedRequestSchema>[];
  context: z.infer<typeof BugReportContextSchema>;
  screenshotDataUrl: string | null;
  videoUrl: string | null;
  videoFilePath: string | null;
  /** False when MongoDB has video metadata but the file is not on this server's disk. */
  videoAvailableOnDisk: boolean;
  /** False when the recording has no audio track (transcription not possible). */
  videoHasAudio: boolean;
  transcriptionText: string | null;
  detectedLanguage: BugReportDetectedLanguage | null;
  transcriptionStatus: BugReportTranscriptionStatus | null;
  transcriptionError: string | null;
  transcriptionConfidence: number | null;
  transcriptionGeneratedAt: string | null;
  attachments: BugReportAttachment[];
}
