import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { LeaveStatus } from '@mams/types';
import { leaveApi, type LeaveApplicationItem, type LeaveTypeItem } from '../../api/leave';
import type { LeaveSummary } from '../../api/leave';
import { DashboardStatCard } from '../ui/DashboardStatCard';
import { Badge } from '../ui/Badge';
import { Input, Select } from '../ui/Field';
import { MobileFilterBar } from '../ui/MobileFilterBar';
import { countActiveFilters } from '../../lib/countActiveFilters';
import { EMPTY_CELL, fmtDate } from '../../lib/format';
import { employeeInitials, leaveTypeLabel, leaveStatusTone } from './leaveUtils';
import { LeaveApplicationCardList } from './LeaveApplicationCardList';
import { useToast } from '../ui/Toast';
import { SortableTh } from '../ui/SortableTh';
import { TablePagination } from '../ui/TablePagination';
import { nextSortState, sortArrowFor, type SortDir } from '../../lib/tableSort';
import { tableColumnTooltip } from '../../lib/tooltips/tableColumnTooltips';
import { STAT_CARD_TOOLTIPS } from '../../lib/tooltips/statCardTooltips';

export function LeaveRequestsTab({
  canApply,
  canApprove,
  canConfigure,
  summary,
  types,
  onView,
  onApprove,
  onReject,
  onAddLeave,
  onGoToSettings,
}: {
  canApply: boolean;
  canApprove: boolean;
  canConfigure: boolean;
  summary?: LeaveSummary;
  types: LeaveTypeItem[];
  onView: (item: LeaveApplicationItem) => void;
  onApprove: (item: LeaveApplicationItem) => void;
  onReject: (item: LeaveApplicationItem) => void;
  onAddLeave: () => void;
  onGoToSettings: () => void;
}) {
  const [activeTile, setActiveTile] = useState<'all' | 'today' | 'pending' | 'upcoming' | 'month'>('all');
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [expandedReason, setExpandedReason] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const toast = useToast((s) => s.push);

  const exportParams = () => ({
    status: statusFilter === 'All' ? undefined : statusFilter,
    search: search || undefined,
    leaveTypeId: typeFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const onExportExcel = async () => {
    setExporting(true);
    try {
      await leaveApi.downloadApplicationsXlsx(exportParams());
      toast('Excel download started', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const exportButton = (
    <button type="button" className="btn-outline btn-sm" onClick={() => void onExportExcel()} disabled={exporting}>
      {exporting ? 'Exporting…' : 'Export Excel'}
    </button>
  );

  const filterDefaults = { statusFilter: 'All' as const, typeFilter: '', startDate: '', endDate: '' };
  const activeCount = countActiveFilters(
    { statusFilter, typeFilter, startDate, endDate },
    filterDefaults
  );

  const toYMD = (d: Date) => d.toISOString().slice(0, 10);

  const clickTile = (tile: typeof activeTile) => {
    const next = activeTile === tile ? 'all' : tile;
    setActiveTile(next);
    setStatusFilter('All');
    setStartDate('');
    setEndDate('');
    setPage(1);
    if (next === 'today') {
      const t = toYMD(new Date());
      setStartDate(t);
      setEndDate(t);
    } else if (next === 'pending') {
      setStatusFilter('Pending');
    } else if (next === 'upcoming') {
      const today = new Date();
      const from = new Date(today); from.setDate(from.getDate() + 1);
      const to = new Date(today); to.setDate(to.getDate() + 7);
      setStartDate(toYMD(from));
      setEndDate(toYMD(to));
    } else if (next === 'month') {
      const today = new Date();
      setStartDate(toYMD(new Date(today.getFullYear(), today.getMonth(), 1)));
      setEndDate(toYMD(new Date(today.getFullYear(), today.getMonth() + 1, 0)));
    }
  };

  const clearFilters = () => {
    setActiveTile('all');
    setStatusFilter('All');
    setTypeFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const { data: applications, isLoading } = useQuery({
    queryKey: ['leave', 'applications', { statusFilter, search, typeFilter, startDate, endDate, page, sortBy, sortDir }],
    queryFn: () =>
      leaveApi.listApplications({
        status: statusFilter === 'All' ? undefined : statusFilter,
        search: search || undefined,
        leaveTypeId: typeFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        pageSize: 50,
        sortBy,
        sortDir,
      }),
  });

  const toggleSort = useCallback((col: string) => {
    const next = nextSortState(col, { col: sortBy ?? null, dir: sortDir });
    setSortBy(next.col ?? undefined);
    setSortDir(next.dir);
    setPage(1);
  }, [sortBy, sortDir]);

  const sortArrow = useCallback((col: string) => sortArrowFor(col, sortBy ?? null, sortDir), [sortBy, sortDir]);

  const items = applications?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((applications?.total ?? 0) / (applications?.pageSize ?? 50)));

  const searchField = (
    <Input
      className="md:max-w-xs"
      placeholder="Search employee…"
      value={search}
      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
    />
  );

  const filterFields = (
    <>
      <Select
        className="md:max-w-[160px]"
        value={statusFilter}
        onChange={(e) => { setStatusFilter(e.target.value as LeaveStatus | 'All'); setPage(1); }}
      >
        <option value="All">All statuses</option>
        <option value="Pending">Pending</option>
        <option value="Approved">Approved</option>
        <option value="Rejected">Rejected</option>
        <option value="Cancelled">Cancelled</option>
      </Select>
      <Select
        className="md:max-w-[180px]"
        value={typeFilter}
        onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
      >
        <option value="">All types</option>
        {types.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </Select>
      <Input
        type="date"
        className="md:max-w-[160px]"
        value={startDate}
        onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
        title="From date"
      />
      <Input
        type="date"
        className="md:max-w-[160px]"
        value={endDate}
        min={startDate || undefined}
        onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
        title="To date"
      />
    </>
  );

  return (
    <div>
      {types.length === 0 && (
        <div className="mb-4 p-4 rounded-md bg-surface2 border border-border text-sm">
          <p className="font-medium mb-1">No leave types configured yet</p>
          <p className="text-text-muted">
            Open{' '}
            <button type="button" className="text-link underline" onClick={onGoToSettings}>
              Leave Settings
            </button>
            {canConfigure ? ' and click Seed defaults to create Paid Leave, Casual Leave, Sick Leave, and more.' : ' (leave admin required to seed defaults).'}
          </p>
        </div>
      )}

      <div className="dash-stat-grid mb-6">
        <DashboardStatCard
          label="Leaves Today"
          value={String(summary?.leavesToday ?? 0)}
          accent="primary"
          sub={summary?.leavesTodayNames?.length ? `${summary.leavesTodayNames.length} employee(s)` : 'active today'}
          selected={activeTile === 'today'}
          onClick={() => clickTile('today')}
          tooltip={
            summary?.leavesTodayNames?.length
              ? `${STAT_CARD_TOOLTIPS.leave.leavesToday} ${summary.leavesTodayNames.join(', ')}`
              : STAT_CARD_TOOLTIPS.leave.leavesToday
          }
        />
        <DashboardStatCard
          label="Pending Approvals"
          value={String(summary?.pendingApprovals ?? 0)}
          accent="amber"
          sub="awaiting review"
          selected={activeTile === 'pending'}
          onClick={() => clickTile('pending')}
          tooltip={STAT_CARD_TOOLTIPS.leave.pendingApprovals}
        />
        <DashboardStatCard
          label="Upcoming (7 days)"
          value={String(summary?.upcomingLeaves7Days ?? 0)}
          accent="green"
          sub="starting soon"
          selected={activeTile === 'upcoming'}
          onClick={() => clickTile('upcoming')}
          tooltip={STAT_CARD_TOOLTIPS.leave.upcoming7Days}
        />
        <DashboardStatCard
          label="Leaves This Month"
          value={String(summary?.leavesThisMonth ?? 0)}
          accent="primary"
          sub="total days consumed"
          selected={activeTile === 'month'}
          onClick={() => clickTile('month')}
          tooltip={STAT_CARD_TOOLTIPS.leave.leavesThisMonth}
        />
      </div>

      <MobileFilterBar
        search={searchField}
        activeCount={activeCount}
        onClear={clearFilters}
        desktopClassName="hidden md:flex flex-wrap gap-3 items-center"
        noCard
        className="mb-3"
        actions={
          <>
            {exportButton}
            {canApply && (
              <button type="button" className="btn-primary btn-sm" onClick={onAddLeave}>
                + Add Leave
              </button>
            )}
          </>
        }
      >
        {filterFields}
        <div className="hidden md:flex gap-2 lg:ml-auto">
          {exportButton}
          {canApply && (
            <button type="button" className="btn-primary btn-sm" onClick={onAddLeave}>
              + Add Leave
            </button>
          )}
        </div>
      </MobileFilterBar>

      <LeaveApplicationCardList
        items={items}
        isLoading={isLoading}
        canApply={canApply}
        canApprove={canApprove}
        onView={onView}
        onApprove={onApprove}
        onReject={onReject}
        onAddLeave={onAddLeave}
      />

      <div className="card tbl-scroll hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-subtle border-b border-border bg-surface2/50">
              <SortableTh label="Employee" sortKey="employee" activeCol={sortBy} sortArrow={sortArrow} onSort={toggleSort} className="px-4 py-3" tooltip={tableColumnTooltip('leave', 'employee')} />
              <th className="px-4 py-3">Type</th>
              <SortableTh label="Dates" sortKey="fromDate" activeCol={sortBy} sortArrow={sortArrow} onSort={toggleSort} className="px-4 py-3" tooltip={tableColumnTooltip('leave', 'fromDate')} />
              <SortableTh label="Days" sortKey="totalDays" activeCol={sortBy} sortArrow={sortArrow} onSort={toggleSort} className="px-4 py-3" tooltip={tableColumnTooltip('leave', 'totalDays')} />
              <th className="px-4 py-3">Reason</th>
              <SortableTh label="Status" sortKey="status" activeCol={sortBy} sortArrow={sortArrow} onSort={toggleSort} className="px-4 py-3" tooltip={tableColumnTooltip('leave', 'status')} />
              <th className="py-3 w-24 text-center text-xs font-semibold text-slate-600 dark:text-slate-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-text-muted">Loading…</td></tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-text-muted">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-25">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <p className="text-sm">No leave applications match your filters.{canApply && <> <button type="button" className="text-link underline" onClick={onAddLeave}>Add leave</button></>}</p>
                  </div>
                </td>
              </tr>
            )}
            {items.map((row) => {
              const emp = row.employeeId;
              const reasonExpanded = expandedReason === row._id;
              return (
                <tr key={row._id} className="border-b border-border/60 hover:bg-surface2/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary-bg text-primary-on-bg text-xs font-bold flex items-center justify-center shrink-0">
                        {emp?.name ? employeeInitials(emp.name) : '?'}
                      </div>
                      <div>
                        <div className="font-medium">{emp?.name ?? EMPTY_CELL}</div>
                        <div className="text-xs font-mono text-text-muted">{emp?.empCode}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{leaveTypeLabel(row)}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {fmtDate(row.fromDate)}
                    {row.fromDate !== row.toDate && <> to {fmtDate(row.toDate)}</>}
                  </td>
                  <td className="px-4 py-3 font-mono">{row.totalDays}</td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <span className={reasonExpanded ? '' : 'line-clamp-2'}>{row.reason}</span>
                    {row.reason.length > 80 && (
                      <button
                        type="button"
                        className="text-xs text-link ml-1"
                        onClick={() => setExpandedReason(reasonExpanded ? null : row._id)}
                      >
                        {reasonExpanded ? 'Less' : 'More'}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3"><Badge tone={leaveStatusTone(row.status)}>{row.status}</Badge></td>
                  <td className="py-3 w-24">
                    <div className="flex items-center justify-center gap-0.5">
                      <button type="button" className="w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:text-primary hover:bg-primary-bg transition-colors" title="View" onClick={() => onView(row)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      {canApprove && row.status === 'Pending' && (
                        <>
                          <button type="button" className="w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:text-green hover:bg-green-bg transition-colors" title="Approve" onClick={() => onApprove(row)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="20 6 9 17 4 12"/></svg>
                          </button>
                          <button type="button" className="w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:text-red hover:bg-red/10 transition-colors" title="Reject" onClick={() => onReject(row)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={page}
        totalPages={totalPages}
        total={applications?.total}
        showTotal
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => p + 1)}
      />
    </div>
  );
}
