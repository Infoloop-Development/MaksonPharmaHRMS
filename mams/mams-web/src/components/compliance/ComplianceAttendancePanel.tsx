import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ComplianceShift } from '@mams/types';
import { formatHoursAsHrMin } from '@mams/types';
import {
  complianceAttendanceApi,
  type ComplianceAttendanceRow,
  type ComplianceAttendanceStats,
} from '../../api/complianceAttendance';
import { fmtDate, fmtNumber } from '../../lib/format';
import { useTimeDisplay } from '../../store/timeFormat';
import { countActiveFilters } from '../../lib/countActiveFilters';
import { MobileFilterBar } from '../ui/MobileFilterBar';
import { DashboardStatCard } from '../ui/DashboardStatCard';
import { ComplianceAttendanceCardList } from './ComplianceAttendanceCardList';
import {
  AttendanceStatusPill,
  ComplianceShiftPill,
} from './complianceAttendanceUi';
import { SortableTh } from '../ui/SortableTh';
import { TablePagination } from '../ui/TablePagination';
import { sortArrowFor, type SortDir } from '../../lib/tableSort';

export type ShiftFilter = 'all' | ComplianceShift;

export type ShiftTabLabels = {
  all: string;
  A: string;
  B: string;
  C: string;
};

const DEFAULT_SHIFT_LABELS: ShiftTabLabels = {
  all: 'All Records',
  A: 'Morning',
  B: 'Afternoon',
  C: 'Night',
};

const SHIFT_TILES: { id: ShiftFilter; accent: 'primary' | 'green' | 'amber' | 'red' }[] = [
  { id: 'all', accent: 'primary' },
  { id: 'A', accent: 'green' },
  { id: 'B', accent: 'amber' },
  { id: 'C', accent: 'red' },
];

function statsScopeLabel(stats: ComplianceAttendanceStats | undefined, dateFilter: string): string {
  if (dateFilter) return dateFilter;
  if (!stats) return 'today';
  if (stats.scope === 'today') return 'today';
  if (stats.scope === 'date' && stats.scopeDate) return stats.scopeDate;
  if (stats.scope === 'range') return 'date range';
  return 'today';
}

function shiftTileSub(tile: ShiftFilter, scopeLabel: string): string {
  if (tile === 'all') return scopeLabel;
  if (tile === 'A') return `shift A · ${scopeLabel}`;
  if (tile === 'B') return `shift B · ${scopeLabel}`;
  return `shift C · ${scopeLabel}`;
}

function filterBarLabel(search: string, date: string, shiftFilter: ShiftFilter, labels: ShiftTabLabels): string {
  const parts: string[] = [];
  if (shiftFilter === 'A') parts.push(`${labels.A} only`);
  else if (shiftFilter === 'B') parts.push(`${labels.B} only`);
  else if (shiftFilter === 'C') parts.push(`${labels.C} only`);
  if (date) parts.push(date);
  if (search.trim()) parts.push(`"${search.trim()}"`);
  return parts.join(' / ');
}

export type ComplianceAttendancePanelProps = {
  mode?: 'readonly' | 'editable';
  shiftLabels?: ShiftTabLabels;
  showStatsScopeHint?: boolean;
  showGenerateActions?: boolean;
  headerActions?: ReactNode;
  tableToolbar?: ReactNode | ((ctx: { shiftFilter: ShiftFilter }) => ReactNode);
  onEditRow?: (row: ComplianceAttendanceRow) => void;
  emptyDefaultMessage?: string;
  onTotalChange?: (total: number | null) => void;
};

export function ComplianceAttendancePanel({
  mode = 'readonly',
  shiftLabels = DEFAULT_SHIFT_LABELS,
  showStatsScopeHint = true,
  showGenerateActions = false,
  headerActions,
  tableToolbar,
  onEditRow,
  emptyDefaultMessage = 'No attendance records yet. Use Generate or wait for nightly autogen at 00:00 IST.',
  onTotalChange,
}: ComplianceAttendancePanelProps) {
  const { fmtTime } = useTimeDisplay();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>('all');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const pageSize = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['compliance-attendance', { search, date, shiftFilter, page, sortBy, sortDir, pageSize }],
    queryFn: () =>
      complianceAttendanceApi.list({
        search: search.trim() || undefined,
        date: date || undefined,
        alternateShift: shiftFilter === 'all' ? undefined : shiftFilter,
        page,
        pageSize,
        sortBy,
        sortDir,
      }),
  });

  useEffect(() => {
    onTotalChange?.(isLoading ? null : (data?.total ?? 0));
  }, [onTotalChange, isLoading, data?.total]);

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

  const generateMutation = useMutation({
    mutationFn: () => complianceAttendanceApi.generate(date || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance-attendance'] });
    },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const stats = data?.stats;
  const scopeLabel = statsScopeLabel(stats, date);

  const isModified = Boolean(search.trim() || date || shiftFilter !== 'all');
  const emptyMessage = isModified ? 'No attendance records match your filters.' : emptyDefaultMessage;

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

  const generateButton = showGenerateActions ? (
    <button
      type="button"
      className="btn-primary btn-sm shrink-0"
      disabled={generateMutation.isPending}
      onClick={() => generateMutation.mutate()}
    >
      {generateMutation.isPending ? 'Generating…' : 'Generate for date'}
    </button>
  ) : null;

  const resolvedTableToolbar =
    typeof tableToolbar === 'function' ? tableToolbar({ shiftFilter }) : tableToolbar;

  const colSpan = mode === 'editable' ? 10 : 9;

  return (
    <>
      {showGenerateActions && generateMutation.isSuccess && (
        <div className="card p-3 mb-3 text-sm text-green-on-bg bg-green-bg">
          Generated {generateMutation.data.generated} records for {generateMutation.data.date}
          {generateMutation.data.skippedSunday ? ' (Sunday skipped)' : ''}.
        </div>
      )}

      {showGenerateActions && generateMutation.isError && (
        <div className="card p-3 mb-3 text-sm text-red bg-red-bg">
          Generation failed. Try again or pick a weekday date filter.
        </div>
      )}

      <div className="dash-stat-grid">
        {SHIFT_TILES.map((tile) => (
          <DashboardStatCard
            key={tile.id}
            label={shiftLabels[tile.id]}
            value={shiftStatValue(tile.id)}
            sub={shiftTileSub(tile.id, scopeLabel)}
            accent={tile.accent}
            selected={shiftFilter === tile.id}
            onClick={() => clickShiftTile(tile.id)}
            hint="Filters attendance list"
          />
        ))}
      </div>

      {showStatsScopeHint && !date && (
        <p className="text-xs text-text-muted mb-3 -mt-1">
          Stat counts are for <strong className="text-text">{scopeLabel}</strong> (IST). The table below
          shows all dates until you filter by date.
        </p>
      )}

      {isModified && (
        <div className="dash-filter-bar">
          <span className="dash-filter-bar-label">
            Viewing: <strong>{filterBarLabel(search, date, shiftFilter, shiftLabels)}</strong>
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
        actions={
          headerActions || generateButton ? (
            <>
              {headerActions}
              {generateButton}
            </>
          ) : undefined
        }
        desktopClassName="hidden md:flex flex-row gap-3 flex-wrap"
        noCard
        className="mb-3"
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
            <option value="all">{shiftLabels.all}</option>
            <option value="A">{shiftLabels.A}</option>
            <option value="B">{shiftLabels.B}</option>
            <option value="C">{shiftLabels.C}</option>
          </select>
        </div>
        {isModified && (
          <button type="button" className="btn-outline shrink-0 hidden md:inline-flex" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </MobileFilterBar>

      {resolvedTableToolbar && (
        <div className="mb-3 flex flex-wrap items-center gap-2">{resolvedTableToolbar}</div>
      )}

      <ComplianceAttendanceCardList
        items={items}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        onEditRow={mode === 'editable' ? onEditRow : undefined}
      />

      <div className="card overflow-hidden hidden md:block">
        <div className="tbl-scroll">
          <table className="w-full text-sm">
            <thead className="bg-surface2">
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                <SortableTh label="Date" sortKey="date" activeCol={sortBy} sortArrow={sortArrow} onSort={toggleSort} />
                <SortableTh label="Employee" sortKey="name" activeCol={sortBy} sortArrow={sortArrow} onSort={toggleSort} />
                <SortableTh label="Code" sortKey="empCode" activeCol={sortBy} sortArrow={sortArrow} onSort={toggleSort} />
                <SortableTh label="Department" sortKey="department" activeCol={sortBy} sortArrow={sortArrow} onSort={toggleSort} className="hidden lg:table-cell" />
                <SortableTh label="Shift" sortKey="alternateShift" activeCol={sortBy} sortArrow={sortArrow} onSort={toggleSort} />
                <th className="px-4 py-3 font-semibold">Clock-in</th>
                <th className="px-4 py-3 font-semibold">Clock-out</th>
                <SortableTh label="Hours" sortKey="hoursWorked" activeCol={sortBy} sortArrow={sortArrow} onSort={toggleSort} />
                <SortableTh label="Status" sortKey="status" activeCol={sortBy} sortArrow={sortArrow} onSort={toggleSort} />
                {mode === 'editable' && <th className="px-4 py-3 font-semibold w-24">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-10 text-center text-text-muted">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-text-muted">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-25">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      <p className="text-sm">{emptyMessage}</p>
                    </div>
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
                  <td className="px-4 py-2.5 font-mono text-xs">{formatHoursAsHrMin(row.hoursWorked)}</td>
                  <td className="px-4 py-2.5">
                    <AttendanceStatusPill status={row.status} />
                  </td>
                  {mode === 'editable' && (
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        className="btn-outline btn-sm"
                        onClick={() => onEditRow?.(row)}
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {total > pageSize && (
        <TablePagination
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />
      )}
    </>
  );
}