import { useState, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { regularizationApi, type RegularizationListItem } from '../api/regularization';
import { useAuth } from '../store/auth';
import { DashboardStatCard } from '../components/ui/DashboardStatCard';
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
import { CardSortSelect } from '../components/ui/CardSortSelect';
import { STAT_CARD_TOOLTIPS } from '../lib/tooltips/statCardTooltips';

type StatusFilter = 'All' | 'Pending' | 'Approved' | 'Rejected';

export function Regularization() {
  const auth = useAuth((s) => s.user);
  const canCreate = auth?.permissions.includes('write.regularization') ?? false;
  const canApprove = auth?.permissions.includes('approve.regularization') ?? false;
  const pageApiRef = useRef<TourPageApi>({});

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Pending');
  const [cardSort, setCardSort] = useState('date-desc');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<RegularizationListItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['regularization', statusFilter],
    queryFn: () =>
      regularizationApi.list({ status: statusFilter === 'All' ? undefined : statusFilter, pageSize: 200 }),
  });

  const items = data?.items ?? [];
  const sortedItems = useMemo(() => {
    const list = [...items];
    const [field, dir] = cardSort.split('-') as [string, 'asc' | 'desc'];
    list.sort((a, b) => {
      let av = '';
      let bv = '';
      if (field === 'name') {
        const ae = typeof a.employeeId === 'object' && a.employeeId ? a.employeeId : null;
        const be = typeof b.employeeId === 'object' && b.employeeId ? b.employeeId : null;
        av = ae?.name ?? '';
        bv = be?.name ?? '';
      } else {
        av = a.date;
        bv = b.date;
      }
      const cmp = field === 'date' ? av.localeCompare(bv) : av.localeCompare(bv);
      return dir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [items, cardSort]);
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
        <DashboardStatCard
          label="Pending"
          value={String(counts.Pending)}
          sub=""
          accent="amber"
          selected={statusFilter === 'Pending'}
          onClick={() => setStatusFilter('Pending')}
          tooltip={STAT_CARD_TOOLTIPS.regularization.pending}
        />
        <DashboardStatCard
          label="Approved"
          value={String(counts.Approved)}
          sub=""
          accent="green"
          selected={statusFilter === 'Approved'}
          onClick={() => setStatusFilter('Approved')}
          tooltip={STAT_CARD_TOOLTIPS.regularization.approved}
        />
        <DashboardStatCard
          label="Rejected"
          value={String(counts.Rejected)}
          sub=""
          accent="red"
          selected={statusFilter === 'Rejected'}
          onClick={() => setStatusFilter('Rejected')}
          tooltip={STAT_CARD_TOOLTIPS.regularization.rejected}
        />
        <DashboardStatCard
          label="All"
          value={String(counts.Pending + counts.Approved + counts.Rejected)}
          sub=""
          accent="primary"
          selected={statusFilter === 'All'}
          onClick={() => setStatusFilter('All')}
          tooltip={STAT_CARD_TOOLTIPS.regularization.total}
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
        <CardSortSelect
          value={cardSort}
          onChange={setCardSort}
          options={[
            { value: 'date-desc', label: 'Date newest' },
            { value: 'date-asc', label: 'Date oldest' },
            { value: 'name-asc', label: 'Name A–Z' },
            { value: 'name-desc', label: 'Name Z–A' },
          ]}
        />
      </div>

      {isLoading && <div className="text-text-muted">Loading...</div>}
      {!isLoading && sortedItems.length === 0 && (
        <div className="card p-12 text-center text-text-muted">
          No {statusFilter.toLowerCase()} regularization requests.
        </div>
      )}

      <div data-tour-id="regularization-list">
        <RegularizationRequestCardList items={sortedItems} onOpen={setDetailItem} />
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
