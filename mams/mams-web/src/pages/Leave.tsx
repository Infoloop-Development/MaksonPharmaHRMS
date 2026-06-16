import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  canApproveLeave,
  canConfigureLeave,
  canViewLeave,
  canWriteLeave,
} from '@mams/types';
import { leaveApi, type LeaveApplicationItem } from '../api/leave';
import { useAuth } from '../store/auth';
import { useToast } from '../components/ui/Toast';
import { ACTIVITY_QUERY_PREFIX } from '../api/activity';
import { LeavePageHeader } from '../components/leave/LeavePageHeader';
import { LeaveTabBar } from '../components/leave/LeaveTabBar';
import { LeaveReadOnlyBanner } from '../components/leave/LeaveReadOnlyBanner';
import { LeaveRequestsTab } from '../components/leave/LeaveRequestsTab';
import { LeaveHolidaysTab } from '../components/leave/LeaveHolidaysTab';
import { LeaveSettingsTab } from '../components/leave/LeaveSettingsTab';
import { ApplyLeaveModal } from '../components/leave/ApplyLeaveModal';
import { LeaveDetailModal } from '../components/leave/LeaveDetailModal';
import { LeaveDecideModal } from '../components/leave/LeaveDecideModal';
import type { LeaveTab } from '../components/leave/leaveUtils';
import { usePageTourController } from '../hooks/usePageTourController';
import { GiveMeATourButton } from '../components/onboarding/GiveMeATourButton';
import { leaveTourScript } from '../lib/onboarding/scripts/leaveTourScript';
import type { TourPageApi } from '../lib/onboarding/tourTypes';

export function Leave() {
  const user = useAuth((s) => s.user);
  const perms = user?.permissions ?? [];
  const canView = canViewLeave(perms);
  const canApply = canWriteLeave(perms);
  const canApprove = canApproveLeave(perms);
  const canConfigure = canConfigureLeave(perms);
  const readOnly = canView && !canApply && !canApprove && !canConfigure;

  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const pageApiRef = useRef<TourPageApi>({});

  const [tab, setTab] = useState<LeaveTab>('requests');
  const [applyOpen, setApplyOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [decideItem, setDecideItem] = useState<{ item: LeaveApplicationItem; action: 'approve' | 'reject' } | null>(null);

  useEffect(() => {
    if (!canConfigure && (tab === 'holidays' || tab === 'settings')) {
      setTab('requests');
    }
  }, [canConfigure, tab]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['leave'] });
    qc.invalidateQueries({ queryKey: ACTIVITY_QUERY_PREFIX });
  };

  const { data: summary } = useQuery({
    queryKey: ['leave', 'summary'],
    queryFn: leaveApi.summary,
    enabled: canView,
  });
  const { data: types } = useQuery({
    queryKey: ['leave', 'types'],
    queryFn: leaveApi.listTypes,
    enabled: canView,
  });

  const approveMu = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => leaveApi.approve(id, note),
    onSuccess: () => {
      toast('Leave approved', 'success');
      setDecideItem(null);
      invalidate();
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const rejectMu = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => leaveApi.reject(id, note),
    onSuccess: () => {
      toast('Leave rejected', 'success');
      setDecideItem(null);
      invalidate();
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const openApply = () => setApplyOpen(true);

  const tour = usePageTourController('leave', leaveTourScript, {
    pageApiRef,
    ready: canView,
    onBeforeStart: () => pageApiRef.current.closeModals?.(),
  });

  pageApiRef.current = {
    closeModals: () => {
      setApplyOpen(false);
      setDetailId(null);
      setDecideItem(null);
    },
  };

  if (!canView) {
    return (
      <div className="card p-12 text-center text-text-muted">
        You do not have permission to view leave management. Ask an admin for <em>View leave</em> access in Settings → Users.
      </div>
    );
  }

  return (
    <div>
      <LeavePageHeader
        canApply={canApply}
        onAddLeave={openApply}
        tourButton={<GiveMeATourButton onClick={tour.onReplayTour} />}
      />
      <div data-tour-id="leave-tabs">
        <LeaveTabBar tab={tab} onTabChange={setTab} canConfigure={canConfigure} />
        {canConfigure && <span className="sr-only" data-tour-id="leave-holidays-hint" aria-hidden="true" />}
      </div>
      {readOnly && <LeaveReadOnlyBanner />}

      <div data-tour-id="leave-content">
      {tab === 'requests' && (
        <LeaveRequestsTab
          canApply={canApply}
          canApprove={canApprove}
          canConfigure={canConfigure}
          summary={summary}
          types={types?.items ?? []}
          onView={(item) => setDetailId(item._id)}
          onApprove={(item) => setDecideItem({ item, action: 'approve' })}
          onReject={(item) => setDecideItem({ item, action: 'reject' })}
          onAddLeave={openApply}
          onGoToSettings={() => setTab('settings')}
        />
      )}
      {tab === 'holidays' && canConfigure && <LeaveHolidaysTab canConfigure={canConfigure} />}
      {tab === 'settings' && canConfigure && <LeaveSettingsTab canConfigure={canConfigure} />}
      </div>

      {applyOpen && canApply && (
        <ApplyLeaveModal
          types={types?.items ?? []}
          canApprove={canApprove}
          onClose={() => setApplyOpen(false)}
          onSuccess={() => {
            setApplyOpen(false);
            invalidate();
          }}
        />
      )}

      {detailId && <LeaveDetailModal applicationId={detailId} onClose={() => setDetailId(null)} />}

      {decideItem && (
        <LeaveDecideModal
          item={decideItem.item}
          action={decideItem.action}
          pending={approveMu.isPending || rejectMu.isPending}
          onClose={() => setDecideItem(null)}
          onConfirm={(note) => {
            if (decideItem.action === 'approve') {
              approveMu.mutate({ id: decideItem.item._id, note: note || undefined });
            } else {
              if (!note.trim()) {
                toast('Rejection reason is required', 'error');
                return;
              }
              rejectMu.mutate({ id: decideItem.item._id, note });
            }
          }}
        />
      )}
    </div>
  );
}
