import type { QueryClient } from '@tanstack/react-query';
import type { BugReportDetail, BugReportListItem, BugReportListResponse } from '@mams/types';
import { BUG_REPORTING_QUERY_KEY } from '../../api/adminBugReporting';

export function bugReportDetailQueryKey(reportId: string) {
  return [...BUG_REPORTING_QUERY_KEY, reportId] as const;
}

function toListItemPatch(detail: BugReportDetail): Partial<BugReportListItem> {
  return {
    id: detail.id,
    publicId: detail.publicId,
    title: detail.title,
    description: detail.description,
    severity: detail.severity,
    status: detail.status,
    phaseId: detail.phaseId,
    phaseLabel: detail.phaseLabel,
    module: detail.module,
    route: detail.route,
    reporter: detail.reporter,
    assignee: detail.assignee,
    deadline: detail.deadline,
    hasVideo: detail.hasVideo,
    hasAttachments: detail.hasAttachments,
    attachmentCount: detail.attachmentCount,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
  };
}

/** Keep detail + kanban column caches in sync after a successful PATCH. */
export function applyBugReportPatchToCache(qc: QueryClient, detail: BugReportDetail) {
  // Modal may be keyed by either Mongo id or publicId (BUG-xxxx).
  qc.setQueryData(bugReportDetailQueryKey(detail.id), detail);
  if (detail.publicId) {
    qc.setQueryData(bugReportDetailQueryKey(detail.publicId), detail);
  }

  const listPatch = toListItemPatch(detail);
  qc.setQueriesData<BugReportListResponse>(
    { queryKey: [...BUG_REPORTING_QUERY_KEY, 'board'] },
    (prev) => {
      if (!prev?.items?.length) return prev;
      const idx = prev.items.findIndex(
        (r) => r.id === detail.id || (detail.publicId && r.publicId === detail.publicId)
      );
      if (idx < 0) return prev;
      const items = [...prev.items];
      const current = items[idx]!;
      items[idx] = { ...current, ...listPatch };
      return { ...prev, items };
    }
  );
}
