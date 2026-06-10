import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export function Leave() {
  const user = useAuth((s) => s.user);
  const canManage = user?.permissions.includes('manage.leave') ?? false;
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();

  const [tab, setTab] = useState<LeaveTab>('requests');
  const [applyOpen, setApplyOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [decideItem, setDecideItem] = useState<{ item: LeaveApplicationItem; action: 'approve' | 'reject' } | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['leave'] });
    qc.invalidateQueries({ queryKey: ACTIVITY_QUERY_PREFIX });
  };

  const { data: summary } = useQuery({ queryKey: ['leave', 'summary'], queryFn: leaveApi.summary });
  const { data: types } = useQuery({ queryKey: ['leave', 'types'], queryFn: leaveApi.listTypes });

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

  return (
    <div>
      <LeavePageHeader canManage={canManage} onAddLeave={openApply} />
      <LeaveTabBar tab={tab} onTabChange={setTab} />
      {!canManage && <LeaveReadOnlyBanner />}

      {tab === 'requests' && (
        <LeaveRequestsTab
          canManage={canManage}
          summary={summary}
          types={types?.items ?? []}
          onView={(item) => setDetailId(item._id)}
          onApprove={(item) => setDecideItem({ item, action: 'approve' })}
          onReject={(item) => setDecideItem({ item, action: 'reject' })}
          onAddLeave={openApply}
          onGoToSettings={() => setTab('settings')}
        />
      )}
      {tab === 'holidays' && <LeaveHolidaysTab canManage={canManage} />}
      {tab === 'settings' && <LeaveSettingsTab canManage={canManage} />}

      {applyOpen && canManage && (
        <ApplyLeaveModal
          types={types?.items ?? []}
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
