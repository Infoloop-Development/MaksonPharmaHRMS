import type { QueryClient } from '@tanstack/react-query';
import type { BugReportDetail, BugReportListResponse } from '@mams/types';
import { BUG_REPORTING_QUERY_KEY } from '../../api/adminBugReporting';

export function bugReportDetailQueryKey(reportId: string) {
  return [...BUG_REPORTING_QUERY_KEY, reportId] as const;
}

/** Keep detail + kanban column caches in sync after a successful PATCH. */
export function applyBugReportPatchToCache(qc: QueryClient, detail: BugReportDetail) {
  qc.setQueryData(bugReportDetailQueryKey(detail.id), detail);

  qc.setQueriesData<BugReportListResponse>(
    { queryKey: [...BUG_REPORTING_QUERY_KEY, 'board'] },
    (prev) => {
      if (!prev?.items?.length) return prev;
      const idx = prev.items.findIndex((r) => r.id === detail.id);
      if (idx < 0) return prev;
      const items = [...prev.items];
      items[idx] = { ...items[idx], ...detail };
      return { ...prev, items };
    }
  );
}
