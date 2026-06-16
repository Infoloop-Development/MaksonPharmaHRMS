import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { regularizationApi, type RegularizationListItem } from '../api/regularization';
import { useAuth } from '../store/auth';
import { StatCard } from '../components/ui/StatCard';
import { RegularizationPageHeader } from '../components/regularization/RegularizationPageHeader';
import { RegularizationRequestCardList } from '../components/regularization/RegularizationRequestCardList';
import { CreateRegularizationModal } from '../components/regularization/CreateRegularizationModal';
import { RegularizationDetailModal } from '../components/regularization/RegularizationDetailModal';
import { usePageTourController } from '../hooks/usePageTourController';
import { GiveMeATourButton } from '../components/onboarding/GiveMeATourButton';
import {
  REGULARIZATION_TOUR_ACTIONS,
  regularizationTourScript,
} from '../lib/onboarding/scripts/regularizationTourScript';
import type { TourPageApi } from '../lib/onboarding/tourTypes';

type StatusFilter = 'All' | 'Pending' | 'Approved' | 'Rejected';

export function Regularization() {
  const auth = useAuth((s) => s.user);
  const canCreate = auth?.permissions.includes('write.regularization') ?? false;
  const canApprove = auth?.permissions.includes('approve.regularization') ?? false;
  const pageApiRef = useRef<TourPageApi>({});

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Pending');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<RegularizationListItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['regularization', statusFilter],
    queryFn: () =>
      regularizationApi.list({ status: statusFilter === 'All' ? undefined : statusFilter, pageSize: 200 }),
  });

  const items = data?.items ?? [];
  const counts = data?.counts ?? { Pending: 0, Approved: 0, Rejected: 0 };

  const tour = usePageTourController('regularization', regularizationTourScript, {
    pageApiRef,
    actionMap: REGULARIZATION_TOUR_ACTIONS,
    ready: !isLoading,
    onBeforeStart: () => pageApiRef.current.closeCreateModal?.(),
  });

  pageApiRef.current = {
    openCreateModal: () => setCreateOpen(true),
    closeCreateModal: () => setCreateOpen(false),
  };

  if (!canCreate && !canApprove) {
    return (
      <div className="card p-12 text-center text-text-muted">
        You do not have permission to view attendance regularization. Ask an admin for{' '}
        <em>Submit regularization</em> or <em>Approve regularization</em> in Settings → Users.
      </div>
    );
  }

  return (
    <div>
      <RegularizationPageHeader
        canCreate={canCreate}
        onCreate={() => {
          setCreateOpen(true);
          tour.tourRef.current?.onUserAction('create-opened');
        }}
        tourButton={<GiveMeATourButton onClick={tour.onReplayTour} />}
      />

      <div className="dash-stat-grid mb-6" data-tour-id="regularization-status-filters">
        <StatCard
          label="Pending"
          value={counts.Pending}
          accent="amber"
          selected={statusFilter === 'Pending'}
          onClick={() => setStatusFilter('Pending')}
        />
        <StatCard
          label="Approved"
          value={counts.Approved}
          accent="green"
          selected={statusFilter === 'Approved'}
          onClick={() => setStatusFilter('Approved')}
        />
        <StatCard
          label="Rejected"
          value={counts.Rejected}
          accent="red"
          selected={statusFilter === 'Rejected'}
          onClick={() => setStatusFilter('Rejected')}
        />
        <StatCard
          label="All"
          value={counts.Pending + counts.Approved + counts.Rejected}
          accent="primary"
          selected={statusFilter === 'All'}
          onClick={() => setStatusFilter('All')}
        />
      </div>

      {isLoading && <div className="text-text-muted">Loading...</div>}
      {!isLoading && items.length === 0 && (
        <div className="card p-12 text-center text-text-muted">
          No {statusFilter.toLowerCase()} regularization requests.
        </div>
      )}

      <div data-tour-id="regularization-list">
        <RegularizationRequestCardList items={items} onOpen={setDetailItem} />
      </div>

      {createOpen && <CreateRegularizationModal onClose={() => setCreateOpen(false)} />}
      {detailItem && (
        <RegularizationDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          canApprove={canApprove}
        />
      )}
    </div>
  );
}
