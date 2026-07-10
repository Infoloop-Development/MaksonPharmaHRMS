import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BUG_REPORT_ASSIGNEE_UNASSIGNED,
  BUG_REPORT_SEVERITY_LABELS,
  type BugPhase,
  type BugReportListResponse,
  type BugReportSeverity,
} from '@mams/types';
import {
  adminBugReportingApi,
  BUG_PHASES_QUERY_KEY,
  BUG_REPORTING_QUERY_KEY,
} from '../../../api/adminBugReporting';
import { useToast } from '../../ui/Toast';

const BOARD_PAGE_SIZE = 50;

export type BugBoardFilters = {
  severity: BugReportSeverity | '';
  module: string;
  assigneeId: string;
  search: string;
};

function boardQueryKey(phaseId: string, filters: BugBoardFilters) {
  return [
    ...BUG_REPORTING_QUERY_KEY,
    'board',
    phaseId,
    filters.severity,
    filters.module,
    filters.assigneeId,
    filters.search,
  ] as const;
}

export function useBugReportingBoard(enabled: boolean) {
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();

  const [severity, setSeverity] = useState<BugReportSeverity | ''>('');
  const [module, setModule] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filters = useMemo<BugBoardFilters>(
    () => ({
      severity,
      module,
      assigneeId,
      search: debouncedSearch.trim(),
    }),
    [severity, module, assigneeId, debouncedSearch]
  );

  const { data: phasesData, isLoading: phasesLoading } = useQuery({
    queryKey: BUG_PHASES_QUERY_KEY,
    queryFn: () => adminBugReportingApi.phases.list(),
    enabled,
  });

  const phases = phasesData?.phases ?? [];

  const { data: modulesData } = useQuery({
    queryKey: [...BUG_REPORTING_QUERY_KEY, 'modules'],
    queryFn: () => adminBugReportingApi.modules(),
    enabled,
  });

  const { data: assigneesData } = useQuery({
    queryKey: [...BUG_REPORTING_QUERY_KEY, 'assignees'],
    queryFn: () => adminBugReportingApi.listAssignees(),
    enabled,
  });

  const columnQueries = useQueries({
    queries: phases.map((phase) => ({
      queryKey: boardQueryKey(phase.id, filters),
      queryFn: () =>
        adminBugReportingApi.list({
          page: 1,
          pageSize: BOARD_PAGE_SIZE,
          phaseId: phase.id,
          severity: filters.severity || undefined,
          module: filters.module || undefined,
          assigneeId: filters.assigneeId || undefined,
          search: filters.search || undefined,
          sortBy: 'createdAt',
          sortDir: 'desc',
        }),
      enabled: enabled && phases.length > 0,
    })),
  });

  const columns = useMemo(() => {
    const map = {} as Record<string, BugReportListResponse | undefined>;
    phases.forEach((phase, i) => {
      map[phase.id] = columnQueries[i]?.data;
    });
    return map;
  }, [phases, columnQueries]);

  const loadingByPhaseId = useMemo(() => {
    const map = {} as Record<string, boolean>;
    phases.forEach((phase, i) => {
      map[phase.id] = columnQueries[i]?.isLoading ?? false;
    });
    return map;
  }, [phases, columnQueries]);

  const moveMu = useMutation({
    mutationFn: ({ reportId, phaseId }: { reportId: string; phaseId: string }) =>
      adminBugReportingApi.patch(reportId, { phaseId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: BUG_REPORTING_QUERY_KEY });
    },
    onError: (e: unknown) => {
      toast(e instanceof Error ? e.message : 'Failed to update phase', 'error');
      void qc.invalidateQueries({ queryKey: BUG_REPORTING_QUERY_KEY });
    },
  });

  const onMove = (reportId: string, fromPhaseId: string, toPhaseId: string, phaseLabel: string) => {
    const fromKey = boardQueryKey(fromPhaseId, filters);
    const toKey = boardQueryKey(toPhaseId, filters);
    const fromData = qc.getQueryData<BugReportListResponse>(fromKey);
    const toData = qc.getQueryData<BugReportListResponse>(toKey);
    const item = fromData?.items.find((r) => r.id === reportId);
    if (!item) return;

    const moved = { ...item, phaseId: toPhaseId, phaseLabel };

    qc.setQueryData<BugReportListResponse>(fromKey, (prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.filter((r) => r.id !== reportId),
            total: Math.max(0, prev.total - 1),
          }
        : prev
    );
    qc.setQueryData<BugReportListResponse>(toKey, (prev) =>
      prev
        ? {
            ...prev,
            items: [moved, ...prev.items.filter((r) => r.id !== reportId)].slice(0, BOARD_PAGE_SIZE),
            total: prev.total + 1,
          }
        : prev
    );

    moveMu.mutate({ reportId, phaseId: toPhaseId });
    void phaseLabel;
  };

  const assigneeOptions = (assigneesData?.items ?? []).map((u) => ({
    _id: u.id,
    name: u.name,
    role: u.role,
  }));
  const itAdminOptions = assigneeOptions;

  return {
    filters: { severity, module, assigneeId, search },
    setSeverity,
    setModule,
    setAssigneeId,
    setSearch,
    phases,
    phasesLoading,
    columns,
    loadingByPhaseId,
    onMove,
    modules: modulesData?.modules ?? [],
    assigneeOptions,
    itAdminOptions,
    severityLabels: BUG_REPORT_SEVERITY_LABELS,
    unassignedValue: BUG_REPORT_ASSIGNEE_UNASSIGNED,
  };
}

export type { BugPhase };
