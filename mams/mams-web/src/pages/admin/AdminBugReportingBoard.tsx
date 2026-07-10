import { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { canManageBugReports } from '@mams/types';
import { useAuth } from '../../store/auth';
import {
  BugReportingBoardPanel,
  BugReportingFilterPanel,
} from '../../components/admin/bugReporting/BugReportingBoardPanel';
import { useBugReportingBoard } from '../../components/admin/bugReporting/useBugReportingBoard';
import { BugReportDetailModal } from '../../components/bugReport/BugReportDetailModal';
import { BugReportingAccessDenied } from '../../components/admin/bugReporting/BugReportingAccessDenied';
import { adminBugReportingApi } from '../../api/adminBugReporting';

export function AdminBugReportingBoard() {
  const user = useAuth((s) => s.user);
  const canAccess = canManageBugReports(user?.permissions ?? []);
  const { publicId: routePublicId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const board = useBugReportingBoard(canAccess);

  const publicId = routePublicId ?? null;

  useEffect(() => {
    const openId = searchParams.get('open');
    if (!openId || publicId) return;
    void adminBugReportingApi
      .getOne(openId)
      .then((data) => {
        navigate(`/admin/bug-reporting/board/${data.publicId}`, { replace: true });
      })
      .catch(() => {
        navigate('/admin/bug-reporting/board', { replace: true });
      });
  }, [searchParams, publicId, navigate]);

  const onOpen = (ref: string, itemPublicId?: string) => {
    const target = itemPublicId?.trim() || ref;
    navigate(`/admin/bug-reporting/board/${encodeURIComponent(target)}`);
  };

  const onCloseModal = () => {
    navigate('/admin/bug-reporting/board');
  };

  if (!canAccess) return <BugReportingAccessDenied />;

  return (
    <div className="flex h-full min-h-0 flex-col p-3 sm:p-4">
      <BugReportingBoardPanel
        chromeless
        phases={board.phases}
        phasesLoading={board.phasesLoading}
        columns={board.columns}
        loadingByPhaseId={board.loadingByPhaseId}
        onOpen={onOpen}
        onMove={board.onMove}
        shareVariant="board"
        filtersSlot={
          <BugReportingFilterPanel
            compact
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
        reportId={publicId}
        open={Boolean(publicId)}
        onClose={onCloseModal}
        phases={board.phases}
        assigneeOptions={board.assigneeOptions}
        itAdminOptions={board.itAdminOptions}
        shareVariant="board"
      />
    </div>
  );
}
