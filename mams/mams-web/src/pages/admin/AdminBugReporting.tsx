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
import { ItAdminSubNav } from '../../components/admin/itAdmin/ItAdminSubNav';
import { BugReportingAccessDenied } from '../../components/admin/bugReporting/BugReportingAccessDenied';
import { adminBugReportingApi } from '../../api/adminBugReporting';

const RESERVED_PUBLIC_IDS = new Set(['settings', 'it-admins', 'board', 'legacy']);

export function AdminBugReporting() {
  const user = useAuth((s) => s.user);
  const canAccess = canManageBugReports(user?.permissions ?? []);
  const { publicId: routePublicId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const board = useBugReportingBoard(canAccess);

  const publicId =
    routePublicId && !RESERVED_PUBLIC_IDS.has(routePublicId) ? routePublicId : null;

  useEffect(() => {
    const openId = searchParams.get('open');
    if (!openId || publicId) return;
    void adminBugReportingApi
      .getOne(openId)
      .then((data) => {
        navigate(`/admin/bug-reporting/${data.publicId}`, { replace: true });
      })
      .catch(() => {
        navigate('/admin/bug-reporting', { replace: true });
      });
  }, [searchParams, publicId, navigate]);

  const onOpen = (ref: string, itemPublicId?: string) => {
    const target = itemPublicId?.trim() || ref;
    navigate(`/admin/bug-reporting/${encodeURIComponent(target)}`);
  };

  const onCloseModal = () => {
    navigate('/admin/bug-reporting');
  };

  if (!canAccess) return <BugReportingAccessDenied />;

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
        shareVariant="default"
        filtersSlot={
          <BugReportingFilterPanel
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
        shareVariant="default"
      />
    </div>
  );
}
