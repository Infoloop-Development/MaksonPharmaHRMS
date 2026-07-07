import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { canManageBugReports } from '@mams/types';
import { useAuth } from '../../store/auth';
import {
  BugReportingBoardPanel,
  BugReportingFilters,
} from '../../components/admin/bugReporting/BugReportingBoardPanel';
import { useBugReportingBoard } from '../../components/admin/bugReporting/useBugReportingBoard';
import { BugReportDetailModal } from '../../components/bugReport/BugReportDetailModal';
import { ItAdminSubNav } from '../../components/admin/itAdmin/ItAdminSubNav';

export function AdminBugReporting() {
  const user = useAuth((s) => s.user);
  const canAccess = canManageBugReports(user?.permissions ?? []);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const board = useBugReportingBoard(canAccess);

  useEffect(() => {
    const openId = searchParams.get('open');
    if (openId) setSelectedReportId(openId);
  }, [searchParams]);

  const onOpen = (id: string) => {
    setSelectedReportId(id);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('open', id);
      return next;
    });
  };

  const onCloseModal = () => {
    setSelectedReportId(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('open');
      return next;
    });
  };

  if (!canAccess) return <Navigate to="/admin" replace />;

  return (
    <div>
      <ItAdminSubNav />
      <BugReportingBoardPanel
        phases={board.phases}
        phasesLoading={board.phasesLoading}
        columns={board.columns}
        loadingByPhaseId={board.loadingByPhaseId}
        onOpen={onOpen}
        onMove={board.onMove}
        filtersSlot={
          <BugReportingFilters
            search={board.filters.search}
            onSearchChange={board.setSearch}
            module={board.filters.module}
            onModuleChange={board.setModule}
            modules={board.modules}
            severity={board.filters.severity}
            onSeverityChange={(v) => board.setSeverity(v as typeof board.filters.severity)}
            severityLabels={board.severityLabels}
            assigneeId={board.filters.assigneeId}
            onAssigneeIdChange={board.setAssigneeId}
            assigneeOptions={board.assigneeOptions}
            unassignedValue={board.unassignedValue}
          />
        }
      />

      <BugReportDetailModal
        reportId={selectedReportId}
        open={Boolean(selectedReportId)}
        onClose={onCloseModal}
        phases={board.phases}
        assigneeOptions={board.assigneeOptions}
        itAdminOptions={board.itAdminOptions}
      />
    </div>
  );
}
