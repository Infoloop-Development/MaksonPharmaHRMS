import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ComplianceShift } from '@mams/types';
import { complianceAttendanceApi } from '../api/complianceAttendance';
import { fmtDate, fmtNumber } from '../lib/format';
import { useTimeDisplay } from '../store/timeFormat';
import { countActiveFilters } from '../lib/countActiveFilters';
import { MobileFilterBar } from '../components/ui/MobileFilterBar';
import { DashboardStatCard } from '../components/ui/DashboardStatCard';
import { ComplianceAttendanceCardList } from '../components/compliance/ComplianceAttendanceCardList';
import { ComplianceReportModal } from '../components/compliance/ComplianceReportModal';
import {
  AttendanceStatusPill,
  ComplianceShiftPill,
} from '../components/compliance/complianceAttendanceUi';
import { useToast } from '../components/ui/Toast';

type ShiftFilter = 'all' | ComplianceShift;

const DEFAULT_GEN_MONTH = '2026-05';

const SHIFT_TILES: { id: ShiftFilter; label: string; sub: string; accent: 'primary' | 'green' | 'amber' | 'red' }[] = [
  { id: 'all', label: 'All Records', sub: 'every shift', accent: 'primary' },
  { id: 'A', label: 'Morning', sub: 'shift A', accent: 'green' },
  { id: 'B', label: 'Afternoon', sub: 'shift B', accent: 'amber' },
  { id: 'C', label: 'Night', sub: 'shift C', accent: 'red' },
];

function filterBarLabel(search: string, date: string, shiftFilter: ShiftFilter): string {
  const parts: string[] = [];
  if (shiftFilter === 'A') parts.push('Morning shift only');
  else if (shiftFilter === 'B') parts.push('Afternoon shift only');
  else if (shiftFilter === 'C') parts.push('Night shift only');
  if (date) parts.push(date);
  if (search.trim()) parts.push(`"${search.trim()}"`);
  return parts.join(' / ');
}

export function ComplianceAttendanceLog() {
  const { fmtTime } = useTimeDisplay();
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>('all');
  const [page, setPage] = useState(1);
  const [reportOpen, setReportOpen] = useState(false);
  const [genMonth, setGenMonth] = useState(DEFAULT_GEN_MONTH);
  const pageSize = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['compliance-attendance', { search, date, shiftFilter, page }],
    queryFn: () =>
      complianceAttendanceApi.list({
        search: search.trim() || undefined,
        date: date || undefined,
        alternateShift: shiftFilter === 'all' ? undefined : shiftFilter,
        page,
        pageSize,
      }),
  });

  const generateMutation = useMutation({
    mutationFn: () => complianceAttendanceApi.generate(date || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance-attendance'] });
    },
  });

  const generateMonthMutation = useMutation({
    mutationFn: () => complianceAttendanceApi.generateMonth(genMonth),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['compliance-attendance'] });
      toast(
        `Generated ${result.generated} records across ${result.weekdaysProcessed} weekdays for ${result.yearMonth}`,
        'success'
      );
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const stats = data?.stats;

  const isModified = Boolean(search.trim() || date || shiftFilter !== 'all');
  const emptyMessage = isModified
    ? 'No attendance records match your filters.'
    : 'No attendance records yet. Use Generate or wait for nightly autogen at 00:00 IST.';

  const clearFilters = () => {
    setSearch('');
    setDate('');
    setShiftFilter('all');
    setPage(1);
  };

  const clickShiftTile = (tile: ShiftFilter) => {
    const next: ShiftFilter = shiftFilter === tile && tile !== 'all' ? 'all' : tile;
    setShiftFilter(next);
    setPage(1);
  };

  const shiftStatValue = (tile: ShiftFilter): string => {
    if (!stats) return '—';
    if (tile === 'all') return fmtNumber(stats.total);
    return fmtNumber(stats.byShift[tile]);
  };

  const generateButton = (
    <button
      type="button"
      className="btn-primary btn-sm shrink-0"
      disabled={generateMutation.isPending}
      onClick={() => generateMutation.mutate()}
    >
      {generateMutation.isPending ? 'Generating…' : 'Generate for date'}
    </button>
  );

  const headerActions = (
    <>
      <input
        type="month"
        className="input btn-sm w-auto hidden lg:block"
        value={genMonth}
        onChange={(e) => setGenMonth(e.target.value)}
        aria-label="Month to generate"
      />
      <button
        type="button"
        className="btn-outline btn-sm shrink-0"
        disabled={generateMonthMutation.isPending}
        onClick={() => generateMonthMutation.mutate()}
      >
        {generateMonthMutation.isPending ? 'Generating month…' : 'Generate month'}
      </button>
      <button type="button" className="btn-outline btn-sm shrink-0" onClick={() => setReportOpen(true)}>
        Generate report
      </button>
      {generateButton}
    </>
  );

  const mobileActions = (
    <>
      <button type="button" className="btn-outline btn-sm shrink-0" onClick={() => setReportOpen(true)}>
        Report
      </button>
      {generateButton}
    </>
  );

  return (
    <div>
      <div className="mb-3 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Attendance Log</h1>
          <div className="text-sm text-text-muted">
            {isLoading
              ? 'Loading attendance records…'
              : data
                ? `${fmtNumber(total)} record${total === 1 ? '' : 's'}`
                : 'Autogenerated 8-hour attendance (Morning → Afternoon → Night).'}
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 shrink-0 flex-wrap justify-end">{headerActions}</div>
      </div>

      {generateMonthMutation.isSuccess && (
        <div className="card p-3 mb-3 text-sm text-green-on-bg bg-green-bg">
          Month {generateMonthMutation.data.yearMonth}: {generateMonthMutation.data.generated} records across{' '}
          {generateMonthMutation.data.weekdaysProcessed} weekdays.
        </div>
      )}

      {generateMutation.isSuccess && (
        <div className="card p-3 mb-3 text-sm text-green-on-bg bg-green-bg">
          Generated {generateMutation.data.generated} records for {generateMutation.data.date}
          {generateMutation.data.skippedSunday ? ' (Sunday skipped)' : ''}.
        </div>
      )}

      {generateMutation.isError && (
        <div className="card p-3 mb-3 text-sm text-red bg-red-bg">
          Generation failed. Try again or pick a weekday date filter.
        </div>
      )}

      <div className="dash-stat-grid">
        {SHIFT_TILES.map((tile) => (
          <DashboardStatCard
            key={tile.id}
            label={tile.label}
            value={shiftStatValue(tile.id)}
            sub={tile.sub}
            accent={tile.accent}
            selected={shiftFilter === tile.id}
            onClick={() => clickShiftTile(tile.id)}
            hint="Filters attendance list"
          />
        ))}
      </div>

      {isModified && (
        <div className="dash-filter-bar">
          <span className="dash-filter-bar-label">
            Viewing: <strong>{filterBarLabel(search, date, shiftFilter)}</strong>
          </span>
          <button type="button" className="btn-primary btn-sm" onClick={clearFilters}>
            Reset to Default View
          </button>
        </div>
      )}

      <MobileFilterBar
        search={
          <div className="flex-1 min-w-[200px]">
            <input
              className="input w-full"
              placeholder="Search employee, code, department…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        }
        activeCount={countActiveFilters(
          { search: search.trim(), date, shiftFilter },
          { search: '', date: '', shiftFilter: 'all' }
        )}
        onClear={clearFilters}
        actions={mobileActions}
        desktopClassName="hidden md:flex flex-row gap-3 flex-wrap"
      >
        <div className="w-full sm:w-auto">
          <input
            type="date"
            className="input w-full"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by date"
          />
        </div>
        <div className="w-full sm:w-auto">
          <select
            className="input w-full"
            value={shiftFilter}
            onChange={(e) => {
              setShiftFilter(e.target.value as ShiftFilter);
              setPage(1);
            }}
            aria-label="Compliance shift"
          >
            <option value="all">All shifts</option>
            <option value="A">Morning (A)</option>
            <option value="B">Afternoon (B)</option>
            <option value="C">Night (C)</option>
          </select>
        </div>
        {isModified && (
          <button type="button" className="btn-outline shrink-0 hidden md:inline-flex" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </MobileFilterBar>

      <ComplianceAttendanceCardList items={items} isLoading={isLoading} emptyMessage={emptyMessage} />

      <div className="card overflow-hidden hidden md:block">
        <div className="tbl-scroll">
          <table className="w-full text-sm">
            <thead className="bg-surface2">
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Employee</th>
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold hidden lg:table-cell">Department</th>
                <th className="px-4 py-3 font-semibold">Shift</th>
                <th className="px-4 py-3 font-semibold">Clock-in</th>
                <th className="px-4 py-3 font-semibold">Clock-out</th>
                <th className="px-4 py-3 font-semibold">Hours</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-text-muted">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-text-muted">
                    {emptyMessage}
                  </td>
                </tr>
              )}
              {items.map((row) => (
                <tr key={row._id} className="hover:bg-surface2/50">
                  <td className="px-4 py-2.5 font-mono text-xs">{fmtDate(row.date)}</td>
                  <td className="px-4 py-2.5 font-medium text-text">{row.employeeId?.name ?? '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{row.employeeId?.empCode ?? '—'}</td>
                  <td className="px-4 py-2.5 text-text-muted hidden lg:table-cell">
                    {row.employeeId?.department ?? '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <ComplianceShiftPill shift={row.alternateShift} />
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{fmtTime(row.checkInAt)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">
                    {fmtTime(row.checkOutAt)}
                    {row.checkOutNextDay ? ' (+1)' : ''}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{row.hoursWorked.toFixed(2)}</td>
                  <td className="px-4 py-2.5">
                    <AttendanceStatusPill status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {total > pageSize && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="text-text-muted">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
      {reportOpen && (
        <ComplianceReportModal
          initialYearMonth={genMonth}
          onClose={() => setReportOpen(false)}
        />
      )}
    </div>
  );
}
