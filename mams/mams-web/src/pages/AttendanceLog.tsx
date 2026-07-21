import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AttendanceRawStats } from '@mams/types';
import { attendanceApi } from '../api/attendance';
import { EMPTY_CELL, fmtDate, fmtNumber } from '../lib/format';
import { useTimeDisplay } from '../store/timeFormat';
import { PunchCardList } from '../components/attendance/PunchCardList';
import { DashboardStatCard } from '../components/ui/DashboardStatCard';
import { useActivityLog } from '../hooks/useActivityLog';
import { MobileFilterBar } from '../components/ui/MobileFilterBar';
import { countActiveFilters } from '../lib/countActiveFilters';
import { usePageTourController } from '../hooks/usePageTourController';
import { GiveMeATourButton } from '../components/onboarding/GiveMeATourButton';
import { attendanceTourScript } from '../lib/onboarding/scripts/attendanceTourScript';
import type { TourPageApi } from '../lib/onboarding/tourTypes';
import { SortableTh } from '../components/ui/SortableTh';
import { TablePagination } from '../components/ui/TablePagination';
import { nextSortState, sortArrowFor, useTableSort, type SortDir } from '../lib/tableSort';
import { tableColumnTooltip } from '../lib/tooltips/tableColumnTooltips';
import { STAT_CARD_TOOLTIPS } from '../lib/tooltips/statCardTooltips';
import type { RawPunchRow } from '../api/attendance';

type PunchTypeFilter = 'all' | 'IN' | 'OUT' | 'OTHER';
type PunchTile = 'all' | 'in' | 'out' | 'other';

function punchTypeToTile(punchType: PunchTypeFilter): PunchTile {
  if (punchType === 'IN') return 'in';
  if (punchType === 'OUT') return 'out';
  if (punchType === 'OTHER') return 'other';
  return 'all';
}

function tileToPunchType(tile: PunchTile): PunchTypeFilter {
  if (tile === 'in') return 'IN';
  if (tile === 'out') return 'OUT';
  if (tile === 'other') return 'OTHER';
  return 'all';
}

function statsScopeLabel(stats: AttendanceRawStats | undefined, hasSearch: boolean): string {
  if (!stats) return '';
  if (hasSearch) return 'filtered';
  if (stats.scope === 'today') return 'today';
  if (stats.scope === 'date' && stats.scopeDate) return stats.scopeDate;
  if (stats.scope === 'range') return 'date range';
  return 'all';
}

function filterBarLabel(
  activeTile: PunchTile,
  search: string,
  date: string,
  outsideShiftOnly: boolean
): string {
  const parts: string[] = [];
  if (activeTile === 'in') parts.push('IN punches only');
  else if (activeTile === 'out') parts.push('OUT punches only');
  else if (activeTile === 'other') parts.push('OTHER punches only');
  if (outsideShiftOnly) parts.push('Outside shift clock-ins only');
  if (date) parts.push(date);
  if (search.trim()) parts.push(`"${search.trim()}"`);
  return parts.join(' / ');
}

export function AttendanceLog() {
  const { fmtTime } = useTimeDisplay();
  const pageApiRef = useRef<TourPageApi>({});
  const { logFilter, logFilterDebounced } = useActivityLog();
  const searchDebounceSkip = useRef(true);
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [punchType, setPunchType] = useState<PunchTypeFilter>('all');
  const [outsideShiftOnly, setOutsideShiftOnly] = useState(false);
  const [activeTile, setActiveTile] = useState<PunchTile>('all');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const pageSize = 50;

  const isLiveMode = !search.trim() && !date && punchType === 'all' && !outsideShiftOnly;

  const statsQuery = useQuery({
    queryKey: ['attendance', 'raw', 'stats', { search, date }],
    queryFn: () =>
      attendanceApi.rawStats({
        search: search.trim() || undefined,
        date: date || undefined,
      }),
    refetchInterval: isLiveMode ? 5000 : false,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', 'raw', { search, date, punchType, outsideShiftOnly, page, isLiveMode, sortBy, sortDir }],
    queryFn: () => {
      if (isLiveMode) {
        return attendanceApi.listRaw({ limit: pageSize }).then((r) => ({
          items: r.items,
          total: r.total,
          page: 1,
          pageSize,
          truncated: r.truncated,
        }));
      }
      return attendanceApi.listRaw({
        search: search.trim() || undefined,
        date: date || undefined,
        punchType: punchType === 'all' ? undefined : punchType,
        outsideShiftOnly: outsideShiftOnly || undefined,
        page,
        pageSize,
        sortBy,
        sortDir,
      });
    },
    refetchInterval: isLiveMode ? 5000 : false,
  });

  const getLiveSortValue = useCallback((row: RawPunchRow, col: string) => {
    switch (col) {
      case 'rawTimestamp':
        return row.rawTimestamp;
      case 'name':
        return row.employeeId?.name;
      case 'empCode':
        return row.employeeId?.empCode;
      case 'punchType':
        return row.punchType;
      default:
        return '';
    }
  }, []);

  const liveSort = useTableSort(
    (data?.items ?? []) as RawPunchRow[],
    getLiveSortValue,
    { rawTimestamp: 'date' }
  );

  const toggleSort = useCallback(
    (col: string) => {
      if (isLiveMode) {
        liveSort.toggleSort(col);
        return;
      }
      const next = nextSortState(col, { col: sortBy ?? null, dir: sortDir });
      setSortBy(next.col ?? undefined);
      setSortDir(next.dir);
      setPage(1);
    },
    [isLiveMode, liveSort, sortBy, sortDir]
  );

  const activeSortCol = isLiveMode ? liveSort.sortCol : sortBy ?? null;
  const activeSortDir = isLiveMode ? liveSort.sortDir : sortDir;
  const sortArrow = useCallback(
    (col: string) => sortArrowFor(col, activeSortCol, activeSortDir),
    [activeSortCol, activeSortDir]
  );

  const displayItems = useMemo(() => {
    if (isLiveMode) return liveSort.sortedRows;
    return data?.items ?? [];
  }, [isLiveMode, liveSort.sortedRows, data?.items]);

  const stats = statsQuery.data;
  const scopeLabel = statsScopeLabel(stats, Boolean(search.trim()));
  const totalSub = stats
    ? `${fmtNumber(stats.uniqueEmployees)} employees · ${scopeLabel}`
    : '';

  const hasFilters = !isLiveMode;
  const isModified =
    activeTile !== 'all' || Boolean(search.trim()) || Boolean(date) || outsideShiftOnly;
  const emptyMessage = hasFilters
    ? 'No punches match your filters.'
    : 'No punches yet. Run the eSSL simulator (scripts/essl-sim.js) to generate some.';

  const clearFilters = () => {
    setSearch('');
    setDate('');
    setPunchType('all');
    setOutsideShiftOnly(false);
    setActiveTile('all');
    setPage(1);
  };

  const tour = usePageTourController('attendance', attendanceTourScript, {
    pageApiRef,
    ready: !isLoading,
    onBeforeStart: () => pageApiRef.current.clearFilters?.(),
  });

  pageApiRef.current = { clearFilters };

  const clickTile = (tile: PunchTile) => {
    const next: PunchTile = activeTile === tile && tile !== 'all' ? 'all' : tile;
    const nextPunchType = tileToPunchType(next);
    setActiveTile(next);
    setPunchType(nextPunchType);
    setPage(1);
    if (next !== 'all') {
      logAttendanceFilter({ punchType: nextPunchType });
    }
  };

  useEffect(() => {
    if (searchDebounceSkip.current) {
      searchDebounceSkip.current = false;
      return;
    }
    if (!search.trim() && !date && punchType === 'all') return;
    logFilterDebounced('attendance', 'filter', {
      search: search.trim() || undefined,
      date: date || undefined,
      punchType: punchType === 'all' ? undefined : punchType,
    });
  }, [search, logFilterDebounced]);

  const logAttendanceFilter = (patch: { search?: string; date?: string; punchType?: string }) => {
    const payload = {
      search: (patch.search ?? search).trim() || undefined,
      date: patch.date !== undefined ? patch.date || undefined : date || undefined,
      punchType:
        patch.punchType !== undefined
          ? patch.punchType === 'all'
            ? undefined
            : patch.punchType
          : punchType === 'all'
            ? undefined
            : punchType,
    };
    logFilter('attendance', 'filter', payload);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between flex-wrap gap-3" data-tour-id="attendance-header">
        <div>
          <h1 className="text-2xl font-bold">Live Attendance Log</h1>
          <div className="text-sm text-text-muted">
            {isLiveMode
              ? 'Live punches from biometric devices, polled every 5s.'
              : data
                ? `${data.total.toLocaleString()} matching punch${data.total === 1 ? '' : 'es'}`
                : 'Search and filter historical punches.'}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <GiveMeATourButton onClick={tour.onReplayTour} />
        {isLiveMode && (
          <span className="px-3 py-1 rounded-full bg-green-bg text-green-on-bg text-xs font-semibold flex items-center gap-1.5 shrink-0" data-tour-id="attendance-live-badge">
            <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
            LIVE
          </span>
        )}
        </div>
      </div>

      <div className="dash-stat-grid" data-tour-id="attendance-stats">
        <DashboardStatCard
          label="Total Punches"
          value={stats ? fmtNumber(stats.total) : EMPTY_CELL}
          sub={totalSub}
          accent="primary"
          selected={activeTile === 'all'}
          onClick={() => clickTile('all')}
          tooltip={STAT_CARD_TOOLTIPS.attendanceLog.total}
        />
        <DashboardStatCard
          label="IN Punches"
          value={stats ? fmtNumber(stats.in) : EMPTY_CELL}
          sub="recorded"
          accent="green"
          selected={activeTile === 'in'}
          onClick={() => clickTile('in')}
          tooltip={STAT_CARD_TOOLTIPS.attendanceLog.in}
        />
        <DashboardStatCard
          label="OUT Punches"
          value={stats ? fmtNumber(stats.out) : EMPTY_CELL}
          sub="recorded"
          accent="amber"
          selected={activeTile === 'out'}
          onClick={() => clickTile('out')}
          tooltip={STAT_CARD_TOOLTIPS.attendanceLog.out}
        />
        <DashboardStatCard
          label="OTHER Punches"
          value={stats ? fmtNumber(stats.other) : EMPTY_CELL}
          sub="recorded"
          accent="red"
          selected={activeTile === 'other'}
          onClick={() => clickTile('other')}
          tooltip={STAT_CARD_TOOLTIPS.attendanceLog.other}
        />
      </div>

      {isModified && (
        <div className="dash-filter-bar">
          <span className="dash-filter-bar-label">
            Viewing: <strong>{filterBarLabel(activeTile, search, date, outsideShiftOnly)}</strong>
          </span>
          <button type="button" className="btn-primary btn-sm" onClick={clearFilters}>
            Reset to Default View
          </button>
        </div>
      )}

      <div data-tour-id="attendance-filters" className="mt-5">
      <MobileFilterBar
        search={
          <div className="flex-1 min-w-[200px]" data-tour-id="attendance-filters-search">
          <input
            className="input w-full"
            placeholder="Search by name, employee code, biometric ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          </div>
        }
        activeCount={countActiveFilters(
          { date, punchType, outsideShiftOnly },
          { date: '', punchType: 'all', outsideShiftOnly: false }
        )}
        onClear={() => {
          setDate('');
          setPunchType('all');
          setOutsideShiftOnly(false);
          setActiveTile('all');
          setPage(1);
        }}
        desktopClassName="hidden md:flex flex-row gap-3 flex-wrap"
        noCard
        className="mb-8"
      >
        <div data-tour-id="attendance-filters-date" className="w-full sm:w-auto">
        <input
          type="date"
          className="input w-full"
          value={date}
          onChange={(e) => {
            const v = e.target.value;
            setDate(v);
            setPage(1);
            logAttendanceFilter({ date: v });
          }}
          aria-label="Filter by date"
        />
        </div>
        <div data-tour-id="attendance-filters-type" className="w-full sm:w-auto">
        <select
          className="input w-full"
          value={punchType}
          onChange={(e) => {
            const v = e.target.value as PunchTypeFilter;
            setPunchType(v);
            setActiveTile(punchTypeToTile(v));
            setPage(1);
            logAttendanceFilter({ punchType: v });
          }}
          aria-label="Punch type"
        >
          <option value="all">All types</option>
          <option value="IN">IN</option>
          <option value="OUT">OUT</option>
          <option value="OTHER">OTHER</option>
        </select>
        </div>
        <label className="flex items-center gap-2 text-sm whitespace-nowrap cursor-pointer" data-tour-id="attendance-outside-shift">
          <input
            type="checkbox"
            className="rounded border-border"
            checked={outsideShiftOnly}
            onChange={(e) => {
              setOutsideShiftOnly(e.target.checked);
              setPage(1);
            }}
          />
          Outside shift clock-ins only
        </label>
        {hasFilters && (
          <button type="button" className="btn-outline shrink-0 hidden md:inline-flex" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </MobileFilterBar>
      </div>

      {data?.truncated && (
        <div className="mb-3 text-xs text-amber bg-amber-bg/40 border border-amber/30 rounded px-3 py-2">
          Showing outside-shift matches from the most recent 5,000 punches only. Narrow the date range for complete results.
        </div>
      )}

      <div data-tour-id="attendance-list">
      <PunchCardList
        items={displayItems}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
      />

      <div className="card overflow-hidden hidden md:block">
        <div className="tbl-scroll">
          <table className="w-full text-sm">
            <thead className="bg-surface2">
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                <SortableTh label="Time" sortKey="rawTimestamp" activeCol={activeSortCol} sortArrow={sortArrow} onSort={toggleSort} tooltip={tableColumnTooltip('attendance', 'rawTimestamp')} />
                <SortableTh label="Employee" sortKey="name" activeCol={activeSortCol} sortArrow={sortArrow} onSort={toggleSort} tooltip={tableColumnTooltip('attendance', 'name')} />
                <SortableTh label="Code" sortKey="empCode" activeCol={activeSortCol} sortArrow={sortArrow} onSort={toggleSort} tooltip={tableColumnTooltip('attendance', 'empCode')} />
                <th className="px-4 py-3 font-semibold hidden lg:table-cell">Department</th>
                <th className="px-4 py-3 font-semibold">Bio ID</th>
                <SortableTh label="Type" sortKey="punchType" activeCol={activeSortCol} sortArrow={sortArrow} onSort={toggleSort} tooltip={tableColumnTooltip('attendance', 'punchType')} />
                <th className="px-4 py-3 font-semibold hidden lg:table-cell">Shift</th>
                <th className="px-4 py-3 font-semibold">Outside shift</th>
                <th className="px-4 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-text-muted">Loading...</td></tr>
              )}
              {!isLoading && displayItems.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-text-muted">{emptyMessage}</td></tr>
              )}
              {displayItems.map((p) => (
                <tr
                  key={p._id}
                  className={`hover:bg-surface2/50 ${
                    p.punchType === 'IN' && p.outsideMainShift === true ? 'bg-amber-bg/30' : ''
                  }`}
                >
                  <td className="px-4 py-2.5 font-mono text-xs">{fmtTime(p.rawTimestamp)}</td>
                  <td className="px-4 py-2.5 font-medium text-text">{p.employeeId?.name ?? '-'}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{p.employeeId?.empCode ?? '-'}</td>
                  <td className="px-4 py-2.5 text-text-muted hidden lg:table-cell">{p.employeeId?.department ?? '-'}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{p.biometricId}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      p.punchType === 'IN' ? 'bg-green-bg text-green-on-bg' :
                      p.punchType === 'OUT' ? 'bg-amber-bg text-amber' :
                      'bg-surface2 text-text-muted'
                    }`}>{p.punchType}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-text-muted hidden lg:table-cell">
                    {p.shiftWindowLabel ?? (p.assignedShift ? p.assignedShift : EMPTY_CELL)}
                  </td>
                  <td className="px-4 py-2.5">
                    {p.punchType === 'IN' && p.outsideMainShift === true && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-bg text-amber">
                        Flagged
                      </span>
                    )}
                    {p.punchType === 'IN' && p.outsideMainShift === false && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-bg text-green-on-bg">
                        OK
                      </span>
                    )}
                    {(p.punchType !== 'IN' || p.outsideMainShift == null) && (
                      <span className="text-text-muted">{EMPTY_CELL}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-text-muted">{fmtDate(p.rawDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {data && data.total > pageSize && !isLiveMode && (
        <TablePagination
          page={page}
          totalPages={Math.ceil(data.total / pageSize)}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />
      )}
    </div>
  );
}
