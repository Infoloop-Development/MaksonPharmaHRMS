import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { VisitorRequestStatus } from '@mams/types';
import { visitorsApi } from '../../api/visitors';
import { StatCard } from '../ui/StatCard';
import { Badge } from '../ui/Badge';
import { Input, Select } from '../ui/Field';
import { MobileFilterBar } from '../ui/MobileFilterBar';
import { countActiveFilters } from '../../lib/countActiveFilters';
import { fmtDate } from '../../lib/format';
import { formatVisitorResponse, visitorStatusTone } from './visitorsUtils';

export function VisitorRequestsTab({
  onView,
}: {
  canApprove: boolean;
  onView: (id: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<VisitorRequestStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const [formFilter, setFormFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const { data: formsData } = useQuery({
    queryKey: ['visitors', 'forms', 'summary'],
    queryFn: visitorsApi.listFormSummaries,
  });

  const filterDefaults = { statusFilter: 'All' as const, formFilter: '', startDate: '', endDate: '' };
  const activeCount = countActiveFilters(
    { statusFilter, formFilter, startDate, endDate },
    filterDefaults
  );

  const clearFilters = () => {
    setStatusFilter('All');
    setFormFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['visitors', 'requests', { statusFilter, search, formFilter, startDate, endDate, page }],
    queryFn: () =>
      visitorsApi.listRequests({
        status: statusFilter === 'All' ? undefined : statusFilter,
        search: search || undefined,
        formId: formFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        pageSize: 50,
      }),
  });

  const items = data?.items ?? [];
  const counts = data?.counts ?? { Pending: 0, Approved: 0, Rejected: 0 };
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 50)));

  const searchField = (
    <Input
      className="md:max-w-xs"
      placeholder="Search requests…"
      value={search}
      onChange={(e) => {
        setSearch(e.target.value);
        setPage(1);
      }}
    />
  );

  const filterFields = (
    <>
      <Select
        className="md:max-w-[160px]"
        value={statusFilter}
        onChange={(e) => {
          setStatusFilter(e.target.value as VisitorRequestStatus | 'All');
          setPage(1);
        }}
      >
        <option value="All">All statuses</option>
        <option value="Pending">Pending</option>
        <option value="Approved">Approved</option>
        <option value="Rejected">Rejected</option>
      </Select>
      <Select
        className="md:max-w-[200px]"
        value={formFilter}
        onChange={(e) => {
          setFormFilter(e.target.value);
          setPage(1);
        }}
      >
        <option value="">All forms</option>
        {(formsData?.items ?? []).map((f) => (
          <option key={f._id} value={f._id}>
            {f.title}
          </option>
        ))}
      </Select>
      <Input
        type="date"
        className="md:max-w-[150px]"
        value={startDate}
        onChange={(e) => {
          setStartDate(e.target.value);
          setPage(1);
        }}
      />
      <Input
        type="date"
        className="md:max-w-[150px]"
        value={endDate}
        onChange={(e) => {
          setEndDate(e.target.value);
          setPage(1);
        }}
      />
    </>
  );

  const previewField = (item: (typeof items)[0]) => {
    const fields = item.fieldsSnapshot ?? [];
    const first = [...fields].sort((a, b) => a.order - b.order)[0];
    if (!first) return item.formTitle;
    const val = item.responses[first.id];
    const text = formatVisitorResponse(val);
    return text !== '—' ? `${first.label}: ${text}` : item.formTitle;
  };

  return (
    <div>
      <div className="dash-stat-grid mb-6">
        <StatCard
          label="Pending"
          value={counts.Pending}
          accent="amber"
          selected={statusFilter === 'Pending'}
          onClick={() => {
            setStatusFilter('Pending');
            setPage(1);
          }}
        />
        <StatCard
          label="Approved"
          value={counts.Approved}
          accent="green"
          selected={statusFilter === 'Approved'}
          onClick={() => {
            setStatusFilter('Approved');
            setPage(1);
          }}
        />
        <StatCard
          label="Rejected"
          value={counts.Rejected}
          accent="red"
          selected={statusFilter === 'Rejected'}
          onClick={() => {
            setStatusFilter('Rejected');
            setPage(1);
          }}
        />
        <StatCard
          label="All"
          value={counts.Pending + counts.Approved + counts.Rejected}
          accent="primary"
          selected={statusFilter === 'All'}
          onClick={() => {
            setStatusFilter('All');
            setPage(1);
          }}
        />
      </div>

      <MobileFilterBar
        search={searchField}
        activeCount={activeCount}
        onClear={clearFilters}
        desktopClassName="hidden md:flex flex-wrap gap-3 items-center mb-4"
      >
        {filterFields}
      </MobileFilterBar>

      {isLoading && <p className="text-text-muted text-sm">Loading requests…</p>}
      {!isLoading && items.length === 0 && (
        <div className="card p-12 text-center text-text-muted">No visitor requests match your filters.</div>
      )}

      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item._id}
            type="button"
            className="card w-full text-left p-4 hover:bg-surface2/50 transition-colors"
            onClick={() => onView(item._id)}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{previewField(item)}</p>
                <p className="text-sm text-text-muted">{item.formTitle} · {fmtDate(item.submittedAt)}</p>
              </div>
              <Badge tone={visitorStatusTone(item.status)}>{item.status}</Badge>
            </div>
          </button>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            type="button"
            className="btn-outline text-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span className="text-sm text-text-muted">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="btn-outline text-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
