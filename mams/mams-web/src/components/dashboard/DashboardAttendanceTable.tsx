import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { DashboardAttendanceRow, DashboardAttendanceStatusFilter } from '@mams/types';
import { dashboardApi } from '../../api/dashboard';
import { settingsApi } from '../../api/settings';
import {
  ADMIN_ATTENDANCE_COLUMN_LABELS,
  type AdminAttendanceVisibleColumn,
  resolveAttendanceVisibleColumns,
} from '../../lib/adminOverviewTableUtils';
import {
  fetchAllAttendanceRows,
  openAttendanceTablePrintWindow,
} from '../../lib/adminOverviewTablePrintDocument';
import { brandingFromSettings } from '../../lib/companyBranding';
import { useTimeDisplay } from '../../store/timeFormat';
import { useActivityLog } from '../../hooks/useActivityLog';
import { useToast } from '../ui/Toast';
import { EMPTY_CELL, fmtDate, fmtHours, fmtWeekdayFull } from '../../lib/format';
import { useTableSort } from '../../lib/tableSort';
import { DashboardAttendanceCardList } from './DashboardAttendanceCardList';
import {
  AttendanceShiftPill,
  AttendanceStatusPill,
  useDisplayAttendanceCell,
} from './dashboardAttendanceUi';
import { MobileFilterBar } from '../ui/MobileFilterBar';
import { countActiveFilters } from '../../lib/countActiveFilters';

type ShiftFilter = 'All' | 'Day' | 'Night';
type StatusFilter = DashboardAttendanceStatusFilter;
type SortCol = 'name' | 'id' | 'dept' | 'shift' | 'hrs' | 'status' | null;

const ADMIN_SORT_KEY: Record<AdminAttendanceVisibleColumn, Exclude<SortCol, null>> = {
  name: 'name',
  empCode: 'id',
  department: 'dept',
  shift: 'shift',
  hours: 'hrs',
  status: 'status',
};

const PAGE_SIZE = 50;

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function renderAdminAttendanceCell(
  columnId: AdminAttendanceVisibleColumn,
  row: DashboardAttendanceRow
): ReactNode {
  switch (columnId) {
    case 'name':
      return (
        <Link to={`/employees/${row.employeeId}`} className="dash-emp-link">
          {row.employeeName}
        </Link>
      );
    case 'empCode':
      return <span className="font-mono text-[11px]">{row.empCode}</span>;
    case 'department':
      return row.department;
    case 'shift':
      return <AttendanceShiftPill shift={row.timeShift} />;
    case 'hours':
      return (
        <span className="dash-time">
          {row.totalHoursWorked != null ? fmtHours(row.totalHoursWorked) : '-'}
        </span>
      );
    case 'status':
      return <AttendanceStatusPill status={row.displayStatus} />;
    default:
      return EMPTY_CELL;
  }
}

export function DashboardAttendanceTable({
  selectedDate,
  statusFilter,
  onStatusFilterChange,
  shiftFilter,
  onShiftFilterChange,
  visibleColumns,
  cardTourId,
  filtersTourId,
}: {
  selectedDate: string;
  statusFilter: StatusFilter;
  onStatusFilterChange: (s: StatusFilter) => void;
  shiftFilter: ShiftFilter;
  onShiftFilterChange: (s: ShiftFilter) => void;
  /** When set (Admin Overview), only these columns render. Omit for full dashboard table. */
  visibleColumns?: string[];
  cardTourId?: string;
  filtersTourId?: string;
}) {
  const toast = useToast((s) => s.push);
  const { logDashboardAction } = useActivityLog();
  const formatCell = useDisplayAttendanceCell();
  const { fmtHhmm } = useTimeDisplay();
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get, staleTime: 60_000 });
  const dayShift = settings?.realShifts.find((s) => s.id === 'Day');
  const nightShift = settings?.realShifts.find((s) => s.id === 'Night');
  const dayShiftLabel = dayShift ? `Day (${fmtHhmm(dayShift.start)}–${fmtHhmm(dayShift.end)})` : 'Day';
  const nightShiftLabel = nightShift ? `Night (${fmtHhmm(nightShift.start)}–${fmtHhmm(nightShift.end)})` : 'Night';
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [department, setDepartment] = useState('');
  const shift = shiftFilter;
  const status = statusFilter;
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  const adminVisibleColumns = resolveAttendanceVisibleColumns(visibleColumns);
  const isAdminColumnMode = adminVisibleColumns !== null;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [selectedDate, debouncedSearch, department, shift, status]);

  const { data: departmentsData } = useQuery({
    queryKey: ['dashboard', 'attendance', 'departments'],
    queryFn: dashboardApi.departments,
    staleTime: 5 * 60 * 1000,
  });

  const queryParams = useMemo(
    () => ({
      date: selectedDate,
      search: debouncedSearch.trim() || undefined,
      department: department || undefined,
      timeShift: shift === 'All' ? undefined : shift,
      status,
      page,
      pageSize: PAGE_SIZE,
    }),
    [selectedDate, debouncedSearch, department, shift, status, page]
  );

  const { data, isPending, isFetching, error } = useQuery({
    queryKey: ['dashboard', 'attendance', queryParams],
    queryFn: () => dashboardApi.attendance(queryParams),
    enabled: Boolean(selectedDate),
    placeholderData: keepPreviousData,
  });

  const isInitialLoad = isPending && !data;
  const isRefreshing = isFetching && Boolean(data);

  const getSortValue = useCallback((row: DashboardAttendanceRow, col: string) => {
    switch (col as SortCol) {
      case 'name':
        return row.employeeName;
      case 'id':
        return row.empCode;
      case 'dept':
        return row.department;
      case 'shift':
        return row.timeShift;
      case 'hrs':
        return row.totalHoursWorked ?? -1;
      case 'status':
        return row.displayStatus;
      default:
        return '';
    }
  }, []);

  const { sortCol, setSortCol, setSortDir, toggleSort, sortArrow, sortedRows } = useTableSort(
    data?.items ?? [],
    getSortValue,
    { hrs: 'number' }
  );

  useEffect(() => {
    setSortCol(null);
    setSortDir('asc');
  }, [adminVisibleColumns?.join(','), setSortCol, setSortDir]);

  const rows = sortedRows;

  const hasFilters =
    Boolean(debouncedSearch.trim()) || Boolean(department) || shift !== 'All' || status !== 'All';

  const clearFilters = () => {
    setDepartment('');
    onShiftFilterChange('All');
    onStatusFilterChange('All');
    setPage(1);
  };

  const toggleDashboardSort = (col: SortCol) => {
    if (col) toggleSort(col);
  };

  const dashboardSortArrow = (col: SortCol) => (col ? sortArrow(col) : '▴');

  const onExportPdf = async () => {
    if (!selectedDate) return;
    setExporting('pdf');
    try {
      const settingsData = settings ?? (await settingsApi.get());
      const branding = brandingFromSettings(settingsData);
      const exportFilters = {
        date: selectedDate,
        search: debouncedSearch.trim() || undefined,
        department: department || undefined,
        timeShift: shift === 'All' ? undefined : shift,
        status,
      };
      const { items: allItems, truncated } = await fetchAllAttendanceRows(exportFilters);
      if (allItems.length === 0) {
        toast('No records match the current filters', 'error');
        return;
      }
      const opened = openAttendanceTablePrintWindow({
        branding,
        date: selectedDate,
        items: allItems,
        filters: exportFilters,
        visibleColumns,
        titleSuffix: weekday !== '-' ? `${selectedDate} (${weekday})` : selectedDate,
      });
      if (!opened) {
        toast('Could not start print. Please try again.', 'error');
        return;
      }
      logDashboardAction('ui.dashboard.export_pdf', {
        date: selectedDate,
        search: debouncedSearch.trim() || undefined,
        department: department || undefined,
        timeShift: shift === 'All' ? undefined : shift,
        status,
      });
      if (truncated) {
        toast(`PDF includes first ${allItems.length} records (limit reached)`, 'success');
      } else {
        toast('Attendance PDF ready', 'success');
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Export failed', 'error');
    } finally {
      setExporting(null);
    }
  };

  const onExportExcel = async () => {
    if (!selectedDate) return;
    setExporting('excel');
    try {
      await dashboardApi.downloadAttendanceXlsx({
        date: selectedDate,
        search: debouncedSearch.trim() || undefined,
        department: department || undefined,
        timeShift: shift === 'All' ? undefined : shift,
        status,
      });
      logDashboardAction('ui.dashboard.export_xlsx', {
        date: selectedDate,
        search: debouncedSearch.trim() || undefined,
        department: department || undefined,
        timeShift: shift === 'All' ? undefined : shift,
        status,
      });
      toast('Excel download started', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Export failed', 'error');
    } finally {
      setExporting(null);
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const weekday = selectedDate ? fmtWeekdayFull(selectedDate) : '';
  const filterDefaults = { department: '', shift: 'All' as ShiftFilter, status: 'All' as StatusFilter };
  const activeCount = countActiveFilters({ department, shift, status }, filterDefaults);

  const exportButtons = (
    <>
      <button
        type="button"
        className="btn-outline shrink-0"
        onClick={() => void onExportExcel()}
        disabled={exporting !== null || isInitialLoad}
      >
        <DownloadIcon />
        {exporting === 'excel' ? 'Exporting…' : 'Export Excel'}
      </button>
      <button
        type="button"
        className="btn-green shrink-0"
        onClick={() => void onExportPdf()}
        disabled={exporting !== null || isInitialLoad}
      >
        <DownloadIcon />
        {exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
      </button>
    </>
  );

  const searchField = (
    <input
      className="w-full"
      placeholder="Search name or ID..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  );

  const filterFields = (
    <>
      <select className="w-full" value={department} onChange={(e) => setDepartment(e.target.value)}>
        <option value="">All Depts</option>
        {(departmentsData?.departments ?? []).map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <select className="w-full" value={shift} onChange={(e) => onShiftFilterChange(e.target.value as ShiftFilter)}>
        <option value="All">All Time Shifts</option>
        <option value="Day">{dayShiftLabel}</option>
        <option value="Night">{nightShiftLabel}</option>
      </select>
      <select
        className="w-full"
        value={status}
        onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
      >
        <option value="All">All Status</option>
        <option value="Present">Present</option>
        <option value="On Time">On Time</option>
        <option value="Absent">Absent</option>
        <option value="Late">Late</option>
        <option value="Weekly Off">Weekly Off</option>
        <option value="Half Day">Half Day</option>
      </select>
    </>
  );

  if (!selectedDate) {
    return null;
  }

  return (
    <div className="dash-table-card" data-tour-id={cardTourId ?? 'dashboard-attendance-table'}>
      <div className="dash-table-header">
        <h3>
          Attendance — {fmtDate(selectedDate)}
          {weekday !== '-' && ` (${weekday})`}
        </h3>
        <MobileFilterBar
          noCard
          search={searchField}
          activeCount={activeCount}
          onClear={clearFilters}
          actions={exportButtons}
          desktopClassName="hidden"
          className="w-full md:hidden"
        >
          {filterFields}
        </MobileFilterBar>
        <div className="dash-table-filters hidden md:flex" data-tour-id={filtersTourId}>
          <input
            placeholder="Search name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 170 }}
          />
          <select value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">All Depts</option>
            {(departmentsData?.departments ?? []).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select value={shift} onChange={(e) => onShiftFilterChange(e.target.value as ShiftFilter)}>
            <option value="All">All Time Shifts</option>
            <option value="Day">{dayShiftLabel}</option>
            <option value="Night">{nightShiftLabel}</option>
          </select>
          <select
            value={status}
            onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
          >
            <option value="All">All Status</option>
            <option value="Present">Present</option>
            <option value="On Time">On Time</option>
            <option value="Absent">Absent</option>
            <option value="Late">Late</option>
            <option value="Weekly Off">Weekly Off</option>
            <option value="Half Day">Half Day</option>
          </select>
          {exportButtons}
        </div>
      </div>

      <div className="dash-table-hint">
        Click employee name to view full profile and attendance history
      </div>

      {error && <div className="px-5 py-3 text-red text-sm">Failed to load attendance table.</div>}

      <DashboardAttendanceCardList
        rows={rows}
        isInitialLoad={isInitialLoad}
        isRefreshing={isRefreshing}
        visibleColumns={adminVisibleColumns ?? undefined}
      />

      <div
        className={`dash-table-scroll relative hidden md:block ${isRefreshing ? 'opacity-60 transition-opacity duration-150' : ''}`}
      >
        <table>
          <thead>
            <tr>
              {isAdminColumnMode && adminVisibleColumns ? (
                adminVisibleColumns.map((colId) => {
                  const sortKey = ADMIN_SORT_KEY[colId];
                  return (
                    <th
                      key={colId}
                      className={sortCol === sortKey ? 'sorted' : ''}
                      onClick={() => toggleDashboardSort(sortKey)}
                    >
                      {ADMIN_ATTENDANCE_COLUMN_LABELS[colId]}{' '}
                      <span className="sort-arrow">{dashboardSortArrow(sortKey)}</span>
                    </th>
                  );
                })
              ) : (
                <>
                  <th
                    className={sortCol === 'name' ? 'sorted' : ''}
                    onClick={() => toggleDashboardSort('name')}
                  >
                    Employee <span className="sort-arrow">{dashboardSortArrow('name')}</span>
                  </th>
                  <th className={sortCol === 'id' ? 'sorted' : ''} onClick={() => toggleDashboardSort('id')}>
                    ID <span className="sort-arrow">{dashboardSortArrow('id')}</span>
                  </th>
                  <th
                    className={sortCol === 'dept' ? 'sorted' : ''}
                    onClick={() => toggleDashboardSort('dept')}
                  >
                    Department <span className="sort-arrow">{dashboardSortArrow('dept')}</span>
                  </th>
                  <th
                    className={sortCol === 'shift' ? 'sorted' : ''}
                    onClick={() => toggleDashboardSort('shift')}
                  >
                    Shift <span className="sort-arrow">{dashboardSortArrow('shift')}</span>
                  </th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th className={sortCol === 'hrs' ? 'sorted' : ''} onClick={() => toggleDashboardSort('hrs')}>
                    Hours <span className="sort-arrow">{dashboardSortArrow('hrs')}</span>
                  </th>
                  <th
                    className={sortCol === 'status' ? 'sorted' : ''}
                    onClick={() => toggleDashboardSort('status')}
                  >
                    Status <span className="sort-arrow">{dashboardSortArrow('status')}</span>
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {isInitialLoad && (
              <tr>
                <td
                  colSpan={isAdminColumnMode && adminVisibleColumns ? adminVisibleColumns.length : 8}
                  className="text-center py-8 text-text-subtle"
                >
                  Loading attendance…
                </td>
              </tr>
            )}
            {!isInitialLoad && rows.length === 0 && (
              <tr>
                <td
                  colSpan={isAdminColumnMode && adminVisibleColumns ? adminVisibleColumns.length : 8}
                  className="text-center py-8 text-text-subtle"
                >
                  No attendance records match your filters.
                </td>
              </tr>
            )}
            {!isInitialLoad &&
              rows.map((row) => (
                <tr key={row.employeeId}>
                  {isAdminColumnMode && adminVisibleColumns ? (
                    adminVisibleColumns.map((colId) => (
                      <td key={colId}>{renderAdminAttendanceCell(colId, row)}</td>
                    ))
                  ) : (
                    <>
                      <td>
                        <Link to={`/employees/${row.employeeId}`} className="dash-emp-link">
                          {row.employeeName}
                        </Link>
                      </td>
                      <td className="font-mono text-[11px]">{row.empCode}</td>
                      <td>{row.department}</td>
                      <td>
                        <AttendanceShiftPill shift={row.timeShift} />
                      </td>
                      <td className="dash-time">{formatCell(row.entryStamp)}</td>
                      <td className="dash-time">{formatCell(row.exitStamp)}</td>
                      <td className="dash-time">
                        {row.totalHoursWorked != null ? fmtHours(row.totalHoursWorked) : '-'}
                      </td>
                      <td>
                        <AttendanceStatusPill status={row.displayStatus} />
                      </td>
                    </>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="dash-table-footer">
        <div className="flex flex-wrap items-center gap-2">
          <span>
            Showing {data?.items.length ?? 0} of {data?.total ?? 0}
          </span>
          {status !== 'All' && (
            <button type="button" className="dash-filter-tag" onClick={() => onStatusFilterChange('All')}>
              {status} ×
            </button>
          )}
          {department && (
            <button type="button" className="dash-filter-tag" onClick={() => setDepartment('')}>
              {department} ×
            </button>
          )}
          {shift !== 'All' && (
            <button type="button" className="dash-filter-tag" onClick={() => onShiftFilterChange('All')}>
              {shift} Shift ×
            </button>
          )}
          {hasFilters && (
            <button type="button" className="dash-filter-tag" onClick={clearFilters}>
              Clear all ×
            </button>
          )}
          {totalPages > 1 && (
            <span className="flex items-center gap-2 ml-1">
              <button
                type="button"
                className="text-text-subtle hover:text-primary disabled:opacity-40"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ‹ Prev
              </button>
              <button
                type="button"
                className="text-text-subtle hover:text-primary disabled:opacity-40"
                disabled={page >= totalPages || isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                Next ›
              </button>
            </span>
          )}
        </div>
        <span>{fmtDate(selectedDate)}</span>
      </div>
    </div>
  );
}
