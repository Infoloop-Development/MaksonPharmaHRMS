import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type {
  AdminOverviewTableConfig,
  AdminOverviewTableKind,
  DashboardAttendanceStatusFilter,
  Permission,
  Role,
} from '@mams/types';
import { ROLE_LABELS } from '@mams/types';
import { adminOverviewApi } from '../../../api/admin';
import { settingsApi } from '../../../api/settings';
import { brandingFromSettings } from '../../../lib/companyBranding';
import {
  fetchAllGenericTableRows,
  openGenericTablePrintWindow,
  type GenericTableExportFilters,
} from '../../../lib/adminOverviewTablePrintDocument';
import { canAccessTableKind } from '../../../lib/adminOverviewKpiRegistry';
import {
  ADMIN_TABLE_SCROLL_CLASS,
  GENERIC_TABLE_FILTER_DEFAULTS,
  TABLE_KIND_HINTS,
  isSortColumnValid,
  kindLabel,
  resolveGenericTableColumns,
  type GenericTableFilterDefaults,
} from '../../../lib/adminOverviewTableUtils';
import { countActiveFilters } from '../../../lib/countActiveFilters';
import { EMPTY_CELL, fmtDate } from '../../../lib/format';
import { useTableSort } from '../../../lib/tableSort';
import { tableColumnTooltip, type TableColumnModule } from '../../../lib/tooltips/tableColumnTooltips';
import { useToast } from '../../ui/Toast';
import { InfoTip } from '../../ui/Tooltip';
import { MobileFilterBar } from '../../ui/MobileFilterBar';
import { AdminOverviewGenericCardList } from './AdminOverviewGenericCardList';
import { DashboardAttendanceTable } from '../../dashboard/DashboardAttendanceTable';

const PAGE_SIZE = 20;
const DASH_SELECT =
  'px-3 py-2 border-[1.5px] border-border rounded-md text-xs bg-surface2 outline-none w-full md:w-auto';

const MONO_COLS = new Set(['empCode', 'deviceCode', 'biometricId', 'occurredAt', 'lastLogin', 'lastPing']);
const TIMESTAMP_COLS = new Set(['occurredAt', 'lastLogin', 'lastPing']);

function tooltipModuleForKind(kind: AdminOverviewTableKind): TableColumnModule | null {
  switch (kind) {
    case 'users':
      return 'settings';
    case 'audit':
      return 'audit';
    case 'devices':
      return 'devices';
    case 'employees':
      return 'employees';
    case 'attendance':
      return 'attendance';
    default:
      return null;
  }
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function cellValue(col: string, row: Record<string, unknown>): string {
  if (col === 'occurredAt' && row.occurredAt) return new Date(String(row.occurredAt)).toLocaleString();
  if (col === 'lastLogin' && row.lastLogin) return new Date(String(row.lastLogin)).toLocaleString();
  if (col === 'lastPing' && row.lastPing) return new Date(String(row.lastPing)).toLocaleString();
  if (col === 'active' || col === 'online') return row[col] ? 'Yes' : 'No';
  const val = row[col];
  if (val == null || val === '') return EMPTY_CELL;
  return String(val);
}

function RolePill({ role }: { role: string }) {
  return <span className="dash-pill-blue">{role}</span>;
}

function BoolPill({ value }: { value: boolean }) {
  return <span className={value ? 'dash-pill-green' : 'dash-pill-red'}>{value ? 'Yes' : 'No'}</span>;
}

function EmployeeStatusPill({ status }: { status: string }) {
  const tone =
    status === 'Active' ? 'dash-pill-green' : status === 'Inactive' ? 'dash-pill-red' : 'dash-pill-amber';
  return <span className={tone}>{status}</span>;
}

function renderGenericCell(col: string, row: Record<string, unknown>): ReactNode {
  if (col === 'role') {
    const val = row.role;
    return val ? <RolePill role={String(val)} /> : EMPTY_CELL;
  }
  if (col === 'active' || col === 'online') return <BoolPill value={Boolean(row[col])} />;
  if (col === 'status' && row.status != null) return <EmployeeStatusPill status={String(row.status)} />;
  const text = cellValue(col, row);
  if (MONO_COLS.has(col) || TIMESTAMP_COLS.has(col)) return <span className="dash-time">{text}</span>;
  return text;
}

function PermissionDeniedTable({ kind }: { kind: string }) {
  return (
    <div className="dash-table-card">
      <div className="dash-table-header">
        <h3>Data table</h3>
      </div>
      <p className="px-5 py-8 text-sm text-text-muted text-center">
        You do not have permission to view the {kind} dataset.
      </p>
    </div>
  );
}

function GenericAdminTable({ config }: { config: AdminOverviewTableConfig }) {
  const toast = useToast((s) => s.push);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);
  const [filters, setFilters] = useState<GenericTableFilterDefaults>({ ...GENERIC_TABLE_FILTER_DEFAULTS });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
    setSearch('');
    setDebouncedSearch('');
    setFilters({ ...GENERIC_TABLE_FILTER_DEFAULTS });
  }, [config.kind]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const columns = useMemo(() => resolveGenericTableColumns(config), [config]);
  const columnIds = useMemo(() => columns.map((c) => c.id), [columns]);

  const activeFilter =
    filters.active === 'All' ? undefined : filters.active === 'yes';
  const onlineFilter =
    filters.online === 'All' ? undefined : filters.online === 'yes';

  const usersQuery = useQuery({
    queryKey: ['admin-overview', 'users', debouncedSearch, page, filters.role, filters.active],
    queryFn: () =>
      adminOverviewApi.users({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        role: filters.role || undefined,
        active: activeFilter,
      }),
    enabled: config.kind === 'users',
    placeholderData: keepPreviousData,
  });
  const auditQuery = useQuery({
    queryKey: ['admin-overview', 'audit', debouncedSearch, page, filters.role, filters.eventType],
    queryFn: () =>
      adminOverviewApi.audit({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        role: filters.role || undefined,
        eventType: filters.eventType || undefined,
      }),
    enabled: config.kind === 'audit',
    placeholderData: keepPreviousData,
  });
  const devicesQuery = useQuery({
    queryKey: ['admin-overview', 'devices', debouncedSearch, page, filters.location, filters.online],
    queryFn: () =>
      adminOverviewApi.devices({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        location: filters.location || undefined,
        online: onlineFilter,
      }),
    enabled: config.kind === 'devices',
    placeholderData: keepPreviousData,
  });
  const employeesQuery = useQuery({
    queryKey: ['admin-overview', 'employees', debouncedSearch, page, filters.status, filters.department],
    queryFn: () =>
      adminOverviewApi.employees({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: filters.status || undefined,
        department: filters.department || undefined,
      }),
    enabled: config.kind === 'employees',
    placeholderData: keepPreviousData,
  });

  const activeQuery =
    config.kind === 'users'
      ? usersQuery
      : config.kind === 'audit'
        ? auditQuery
        : config.kind === 'devices'
          ? devicesQuery
          : employeesQuery;

  const items = (activeQuery.data?.items ?? []) as Record<string, unknown>[];
  const total = activeQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isInitialLoad = activeQuery.isLoading && !activeQuery.data;
  const isRefreshing = activeQuery.isFetching && Boolean(activeQuery.data);

  const getSortValue = useCallback(
    (row: Record<string, unknown>, col: string) => cellValue(col, row),
    []
  );

  const timestampColumnTypes = useMemo(
    () => Object.fromEntries([...TIMESTAMP_COLS].map((c) => [c, 'date' as const])),
    []
  );

  const { sortCol, setSortCol, setSortDir, toggleSort, sortArrow, sortedRows } = useTableSort(
    items,
    getSortValue,
    timestampColumnTypes
  );

  useEffect(() => {
    if (!isSortColumnValid(sortCol, columnIds)) {
      setSortCol(null);
      setSortDir('asc');
    }
  }, [sortCol, columnIds, setSortCol, setSortDir]);

  const sorted = sortedRows;

  const activeCount = countActiveFilters(filters, GENERIC_TABLE_FILTER_DEFAULTS);
  const hasFilters = activeCount > 0 || Boolean(debouncedSearch.trim());

  const clearFilters = () => {
    setFilters({ ...GENERIC_TABLE_FILTER_DEFAULTS });
    setSearch('');
    setPage(1);
  };

  const exportFilters = (): GenericTableExportFilters => ({
    ...filters,
    search: debouncedSearch.trim() || undefined,
  });

  const xlsxQueryParams = (): Record<string, string | undefined> => {
    const q: Record<string, string | undefined> = {
      columns: columnIds.join(','),
      search: debouncedSearch.trim() || undefined,
    };
    if (config.kind === 'users') {
      q.role = filters.role || undefined;
      if (filters.active !== 'All') q.active = filters.active === 'yes' ? 'true' : 'false';
    } else if (config.kind === 'audit') {
      q.role = filters.role || undefined;
      q.eventType = filters.eventType || undefined;
    } else if (config.kind === 'devices') {
      q.location = filters.location || undefined;
      if (filters.online !== 'All') q.online = filters.online === 'yes' ? 'true' : 'false';
    } else if (config.kind === 'employees') {
      q.status = filters.status || undefined;
      q.department = filters.department || undefined;
    }
    return q;
  };

  const onExportPdf = async () => {
    setExporting('pdf');
    try {
      const settings = await settingsApi.get();
      const branding = brandingFromSettings(settings);
      const { items: allItems, truncated } = await fetchAllGenericTableRows(config, exportFilters());
      if (allItems.length === 0) {
        toast('No records match the current filters', 'error');
        return;
      }
      const opened = openGenericTablePrintWindow({
        branding,
        config,
        items: allItems,
        filters: exportFilters(),
      });
      if (!opened) {
        toast('Could not start print. Please try again.', 'error');
        return;
      }
      if (truncated) {
        toast(`PDF includes first ${allItems.length} records (limit reached)`, 'success');
      } else {
        toast(`${kindLabel(config.kind)} PDF ready`, 'success');
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Export failed', 'error');
    } finally {
      setExporting(null);
    }
  };

  const onExportExcel = async () => {
    setExporting('excel');
    try {
      await adminOverviewApi.downloadTableXlsx(config.kind, xlsxQueryParams());
      toast('Excel download started', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Export failed', 'error');
    } finally {
      setExporting(null);
    }
  };

  const exportButtons = (
    <>
      <button
        type="button"
        className="btn-outline shrink-0 min-h-[44px] sm:min-h-0"
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
      placeholder="Search…"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      aria-label="Search table"
    />
  );

  const roleOptions = (Object.keys(ROLE_LABELS) as Role[]).map((r) => (
    <option key={r} value={r}>
      {ROLE_LABELS[r]}
    </option>
  ));

  const filterFields = (
    <>
      {config.kind === 'users' && (
        <>
          <select className={DASH_SELECT} value={filters.role} onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}>
            <option value="">All roles</option>
            {roleOptions}
          </select>
          <select className={DASH_SELECT} value={filters.active} onChange={(e) => setFilters((f) => ({ ...f, active: e.target.value }))}>
            <option value="All">All statuses</option>
            <option value="yes">Active</option>
            <option value="no">Inactive</option>
          </select>
        </>
      )}
      {config.kind === 'audit' && (
        <>
          <select className={DASH_SELECT} value={filters.role} onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}>
            <option value="">All roles</option>
            {roleOptions}
          </select>
          <input
            className={DASH_SELECT}
            placeholder="Event type…"
            value={filters.eventType}
            onChange={(e) => setFilters((f) => ({ ...f, eventType: e.target.value }))}
          />
        </>
      )}
      {config.kind === 'devices' && (
        <>
          <input
            className={DASH_SELECT}
            placeholder="Location…"
            value={filters.location}
            onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
          />
          <select className={DASH_SELECT} value={filters.online} onChange={(e) => setFilters((f) => ({ ...f, online: e.target.value }))}>
            <option value="All">All devices</option>
            <option value="yes">Online</option>
            <option value="no">Offline</option>
          </select>
        </>
      )}
      {config.kind === 'employees' && (
        <>
          <select className={DASH_SELECT} value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="">All statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <input
            className={DASH_SELECT}
            placeholder="Department…"
            value={filters.department}
            onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}
          />
        </>
      )}
    </>
  );

  const title = kindLabel(config.kind);
  const tooltipModule = tooltipModuleForKind(config.kind);

  return (
    <div className="dash-table-card" data-tour-id="admin-overview-table-inner">
      <div className="dash-table-header">
        <h3>
          {title}
          <span className="block text-xs font-normal text-text-muted mt-0.5">{total} records</span>
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
        <div className="dash-table-filters hidden md:flex shrink-0" data-tour-id="admin-overview-table-filters">
          <input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 170 }}
            aria-label="Search table"
          />
          {filterFields}
          {exportButtons}
        </div>
      </div>

      <div className="dash-table-hint">{TABLE_KIND_HINTS[config.kind]}</div>

      {activeQuery.error && (
        <div className="px-5 py-3 text-red text-sm">Failed to load table data.</div>
      )}

      <AdminOverviewGenericCardList
        config={config}
        rows={sorted}
        isInitialLoad={isInitialLoad}
        isRefreshing={isRefreshing}
      />

      <div
        className={`${ADMIN_TABLE_SCROLL_CLASS} relative hidden md:block ${isRefreshing ? 'opacity-60 transition-opacity duration-150' : ''}`}
      >
        <table>
          <thead>
            <tr>
              {columns.map((c) => {
                const tip = tooltipModule ? tableColumnTooltip(tooltipModule, c.id) : undefined;
                return (
                <th
                  key={c.id}
                  className={sortCol === c.id ? 'sorted' : ''}
                  onClick={() => toggleSort(c.id)}
                >
                  {c.label}
                  {tip ? (
                    <span
                      className="inline-flex align-middle"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <InfoTip content={tip} label={`About ${c.label}`} />
                    </span>
                  ) : null}{' '}
                  <span className="sort-arrow">{sortArrow(c.id)}</span>
                </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isInitialLoad && (
              <tr>
                <td colSpan={Math.max(columns.length, 1)} className="text-center py-8 text-text-subtle">
                  Loading…
                </td>
              </tr>
            )}
            {!isInitialLoad && sorted.length === 0 && (
              <tr>
                <td colSpan={Math.max(columns.length, 1)} className="text-center py-8 text-text-subtle">
                  No records found.
                </td>
              </tr>
            )}
            {!isInitialLoad &&
              sorted.map((row, i) => (
                <tr key={String(row.id ?? i)}>
                  {columns.map((c) => (
                    <td key={c.id}>{renderGenericCell(c.id, row)}</td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="dash-table-footer">
        <div className="flex flex-wrap items-center gap-2">
          <span>
            Showing {sorted.length} of {total}
          </span>
          {filters.role && (
            <button type="button" className="dash-filter-tag" onClick={() => setFilters((f) => ({ ...f, role: '' }))}>
              {ROLE_LABELS[filters.role as Role] ?? filters.role} ×
            </button>
          )}
          {filters.active !== 'All' && (
            <button type="button" className="dash-filter-tag" onClick={() => setFilters((f) => ({ ...f, active: 'All' }))}>
              {filters.active === 'yes' ? 'Active' : 'Inactive'} ×
            </button>
          )}
          {filters.online !== 'All' && (
            <button type="button" className="dash-filter-tag" onClick={() => setFilters((f) => ({ ...f, online: 'All' }))}>
              {filters.online === 'yes' ? 'Online' : 'Offline'} ×
            </button>
          )}
          {filters.status && (
            <button type="button" className="dash-filter-tag" onClick={() => setFilters((f) => ({ ...f, status: '' }))}>
              {filters.status} ×
            </button>
          )}
          {filters.department && (
            <button type="button" className="dash-filter-tag" onClick={() => setFilters((f) => ({ ...f, department: '' }))}>
              {filters.department} ×
            </button>
          )}
          {filters.location && (
            <button type="button" className="dash-filter-tag" onClick={() => setFilters((f) => ({ ...f, location: '' }))}>
              {filters.location} ×
            </button>
          )}
          {filters.eventType && (
            <button type="button" className="dash-filter-tag" onClick={() => setFilters((f) => ({ ...f, eventType: '' }))}>
              {filters.eventType} ×
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
                disabled={page <= 1 || activeQuery.isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ‹ Prev
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="text-text-subtle hover:text-primary disabled:opacity-40"
                disabled={page >= totalPages || activeQuery.isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                Next ›
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminOverviewTable({
  config,
  permissions,
  selectedDate,
  statusFilter,
  shiftFilter,
  onStatusFilterChange,
  onShiftFilterChange,
}: {
  config: AdminOverviewTableConfig;
  permissions: Permission[];
  selectedDate: string;
  statusFilter?: DashboardAttendanceStatusFilter;
  shiftFilter?: 'All' | 'Day' | 'Night';
  onStatusFilterChange?: (s: DashboardAttendanceStatusFilter) => void;
  onShiftFilterChange?: (s: 'All' | 'Day' | 'Night') => void;
}) {
  if (config.kind === 'attendance') {
    if (!canAccessTableKind('attendance', permissions)) {
      return <PermissionDeniedTable kind="attendance" />;
    }
    return (
      <DashboardAttendanceTable
        key={`attendance-${config.columns.join(',')}`}
        selectedDate={selectedDate}
        statusFilter={statusFilter ?? 'All'}
        onStatusFilterChange={onStatusFilterChange ?? (() => {})}
        shiftFilter={shiftFilter ?? 'All'}
        onShiftFilterChange={onShiftFilterChange ?? (() => {})}
        visibleColumns={config.columns}
        cardTourId="admin-overview-table-inner"
        filtersTourId="admin-overview-table-filters"
      />
    );
  }

  if (!canAccessTableKind(config.kind, permissions)) {
    return <PermissionDeniedTable kind={config.kind} />;
  }

  return <GenericAdminTable key={config.kind} config={config} />;
}

export function adminTableTitle(config: AdminOverviewTableConfig, selectedDate: string): string {
  if (config.kind === 'attendance') {
    return selectedDate ? `Attendance · ${fmtDate(selectedDate)}` : 'Attendance';
  }
  return kindLabel(config.kind);
}

export { ADMIN_TABLE_SCROLL_CLASS };
