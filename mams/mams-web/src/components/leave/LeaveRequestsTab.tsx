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
import { fmtDate } from '../../lib/format';
import { employeeInitials, leaveTypeLabel, leaveStatusTone } from './leaveUtils';
import { LeaveApplicationCardList } from './LeaveApplicationCardList';
import { useToast } from '../ui/Toast';
import { format, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { SortableTh } from '../ui/SortableTh';
import { TablePagination } from '../ui/TablePagination';
import { sortArrowFor, type SortDir } from '../../lib/tableSort';

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
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startsFrom, setStartsFrom] = useState('');
  const [startsTo,setStartsTo] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [expandedReason, setExpandedReason] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const toast = useToast((s) => s.push);
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const weekEndStr = format(addDays(today, 7), 'yyyy-MM-dd');
  const monthStartStr = format(startOfMonth(today), 'yyyy-MM-dd');
  const monthEndStr = format(endOfMonth(today), 'yyyy-MM-dd');

  const exportParams = () => ({
    status: statusFilter === 'All' ? undefined : statusFilter,
    search: search || undefined,
    leaveTypeId: typeFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    startsFrom: startsFrom || undefined,
    startsTo: startsTo || undefined,
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

  const filterDefaults = { statusFilter: 'All' as const, typeFilter: '', startDate: '', endDate: '' ,startsFrom: '', startsTo: ''};
  const activeCount = countActiveFilters(
    { statusFilter, typeFilter, startDate, endDate, startsFrom, startsTo },
    filterDefaults
  );

  const clearFilters = () => {
    setStatusFilter('All');
    setTypeFilter('');
    setStartDate('');
    setEndDate('');
    setStartsFrom('');
    setStartsTo('');
    setPage(1);
  };

  const { data: applications, isLoading } = useQuery({
    queryKey: ['leave', 'applications', { statusFilter, search, typeFilter, startDate, endDate,startsFrom, startsTo, page, sortBy, sortDir }],
    queryFn: () =>
      leaveApi.listApplications({
        status: statusFilter === 'All' ? undefined : statusFilter,
        search: search || undefined,
        leaveTypeId: typeFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        startsFrom: startsFrom || undefined,
        startsTo: startsTo || undefined,
        page,
        pageSize: 50,
        sortBy,
        sortDir,
      }),
  });

  const toggleSort = useCallback((col: string) => {
    setSortBy((prev) => {
      if (prev === col) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return col;
      }
      setSortDir('asc');
      return col;
    });
    setPage(1);
  }, []);

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
        onChange={(e) => { setStartDate(e.target.value); setStartsFrom(''); setStartsTo(''); setPage(1); }}
        title="From date"
      />
      <Input
        type="date"
        className="md:max-w-[160px]"
        value={endDate}
        min={startDate || undefined}
        onChange={(e) => { setEndDate(e.target.value); setStartsFrom(''); setStartsTo(''); setPage(1); }}
        title="To date"
      />
      <button type="button" className="hidden md:inline-flex btn-outline btn-sm shrink-0" onClick={clearFilters}>
        Clear filters
      </button>
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
          sub={summary?.leavesTodayNames?.length ? `${summary.leavesTodayNames.length} employee(s)` : ''}
          title={summary?.leavesTodayNames?.join(', ') || 'No one on leave today'}
          selected={statusFilter === 'Approved' && startDate === todayStr && endDate === todayStr}
          onClick={() => { setStatusFilter('Approved'); setStartDate(todayStr); setEndDate(todayStr); setStartsFrom(''); setStartsTo(''); setPage(1); }}
        />
        <DashboardStatCard
          label="Pending Approvals"
          value={String(summary?.pendingApprovals ?? 0)}
          accent="amber"
          sub=""
          selected={statusFilter === 'Pending'}
          onClick={() => { setStatusFilter('Pending'); setPage(1); }}
        />
        <DashboardStatCard
          label="Upcoming (7 days)"
          value={String(summary?.upcomingLeaves7Days ?? 0)}
          accent="green"
          sub=""
          selected = {statusFilter === 'Approved' && startsFrom === todayStr && startsTo === weekEndStr}
          onClick={() => {setStatusFilter('Approved'); setStartDate(''); setEndDate(''); setStartsFrom(todayStr); setStartsTo(weekEndStr); setPage(1); }}
        />
        <DashboardStatCard
          label="Leaves This Month"
          value={String(summary?.leavesThisMonth ?? 0)}
          accent="primary"
          selected={statusFilter === 'Approved' && startDate === monthStartStr && endDate === monthEndStr}
          onClick={() => {setStatusFilter('Approved'); setStartDate(monthStartStr); setEndDate(monthEndStr); setStartsFrom(''); setStartsTo(''); setPage(1)}}
        />
      </div>

      <MobileFilterBar
        search={searchField}
        activeCount={activeCount}
        onClear={clearFilters}
        desktopClassName="hidden md:flex flex-wrap gap-3 items-center"
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
              <SortableTh label="Employee" sortKey="employee" activeCol={sortBy} sortArrow={sortArrow} onSort={toggleSort} className="px-4 py-3" />
              <th className="px-4 py-3">Type</th>
              <SortableTh label="Dates" sortKey="fromDate" activeCol={sortBy} sortArrow={sortArrow} onSort={toggleSort} className="px-4 py-3" />
              <SortableTh label="Days" sortKey="totalDays" activeCol={sortBy} sortArrow={sortArrow} onSort={toggleSort} className="px-4 py-3" />
              <th className="px-4 py-3">Reason</th>
              <SortableTh label="Status" sortKey="status" activeCol={sortBy} sortArrow={sortArrow} onSort={toggleSort} className="px-4 py-3" />
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-text-muted">Loading…</td></tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-text-muted">
                  No leave applications match your filters.
                  {canApply && (
                    <>
                      {' '}
                      <button type="button" className="text-link underline" onClick={onAddLeave}>Add leave</button>
                    </>
                  )}
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
                        <div className="font-medium">{emp?.name ?? '—'}</div>
                        <div className="text-xs font-mono text-text-muted">{emp?.empCode}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{leaveTypeLabel(row)}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {fmtDate(row.fromDate)}
                    {row.fromDate !== row.toDate && <> — {fmtDate(row.toDate)}</>}
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
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <button type="button" className="btn-outline btn-sm" onClick={() => onView(row)}>View</button>
                      {canApprove && row.status === 'Pending' && (
                        <>
                          <button type="button" className="btn-primary btn-sm" onClick={() => onApprove(row)}>Approve</button>
                          <button type="button" className="btn-outline btn-sm text-red" onClick={() => onReject(row)}>Reject</button>
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
