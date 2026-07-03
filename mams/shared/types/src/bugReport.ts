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
  status: BugReportStatusSchema.optional(),
  reporterId: z.string().optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['createdAt', 'severity', 'status', 'module', 'title']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export type BugReportListQuery = z.infer<typeof BugReportListQuerySchema>;

export const BugReportPatchBodySchema = z
  .object({
    status: BugReportStatusSchema.optional(),
    assigneeId: z.string().nullable().optional(),
  })
  .strict()
  .refine((v) => v.status !== undefined || v.assigneeId !== undefined, {
    message: 'Provide status or assigneeId',
  });

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
  title: string;
  description: string;
  severity: BugReportSeverity;
  status: BugReportStatus;
  module: string;
  route: string;
  reporter: BugReportReporter;
  assignee: BugReportAssignee | null;
  hasVideo: boolean;
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
  consoleLog: z.infer<typeof BugReportConsoleEntrySchema>[];
  breadcrumbs: z.infer<typeof BugReportBreadcrumbSchema>[];
  failedRequests: z.infer<typeof BugReportFailedRequestSchema>[];
  context: z.infer<typeof BugReportContextSchema>;
  screenshotDataUrl: string | null;
  videoUrl: string | null;
  videoFilePath: string | null;
}
