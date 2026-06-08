import { useCallback, useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DashboardAttendanceStatusFilter, DashboardBlockId, DashboardLayoutRow } from '@mams/types';
import { DEFAULT_DASHBOARD_LAYOUT } from '@mams/types';
import { dashboardApi } from '../api/dashboard';
import { DashboardBarChartCard } from '../components/dashboard/DashboardBarChartCard';
import { DashboardDonutChartCard } from '../components/dashboard/DashboardDonutChartCard';
import { DashboardAttendanceTable } from '../components/dashboard/DashboardAttendanceTable';
import { DashboardLayoutEditor } from '../components/dashboard/DashboardLayoutEditor';
import { useDashboardChartState } from '../components/dashboard/useDashboardChartState';
import { layoutEquals } from '../lib/dashboardLayout';
import { fmtDate, fmtNumber, fmtWeekdayShort } from '../lib/format';
import { useToast } from '../components/ui/Toast';

export type DashboardTile = 'total' | 'present' | 'absent' | 'late';
export type BarMetric = 'present' | 'absent' | 'late';

function tileToStatus(tile: DashboardTile | null): DashboardAttendanceStatusFilter {
  if (tile === 'present') return 'Present';
  if (tile === 'absent') return 'Absent';
  if (tile === 'late') return 'Late';
  return 'All';
}

export function statusToTile(status: DashboardAttendanceStatusFilter): DashboardTile | null {
  if (status === 'Present') return 'present';
  if (status === 'Absent') return 'absent';
  if (status === 'Late') return 'late';
  return null;
}

function tileToBarMetric(tile: DashboardTile | null): BarMetric {
  if (tile === 'absent') return 'absent';
  if (tile === 'late') return 'late';
  return 'present';
}

export function Dashboard() {
  const toast = useToast((s) => s.push);
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState('');
  const [activeTile, setActiveTile] = useState<DashboardTile | null>(null);
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [draftRows, setDraftRows] = useState<DashboardLayoutRow[]>(
    () => DEFAULT_DASHBOARD_LAYOUT.rows.map((r) => ({ items: [...r.items] }))
  );

  const statusFilter = tileToStatus(activeTile);
  const barMetric = tileToBarMetric(activeTile);

  const stats = useQuery({ queryKey: ['dashboard', 'stats'], queryFn: dashboardApi.stats });
  const layout = useQuery({ queryKey: ['dashboard', 'layout'], queryFn: dashboardApi.getLayout });
  const charts = useQuery({
    queryKey: ['dashboard', 'charts', selectedDate],
    queryFn: () => dashboardApi.charts(selectedDate || undefined),
    enabled: Boolean(selectedDate),
    placeholderData: keepPreviousData,
  });

  const savedRows = layout.data?.rows ?? DEFAULT_DASHBOARD_LAYOUT.rows;

  useEffect(() => {
    if (layout.data && !isEditingLayout) {
      setDraftRows(layout.data.rows.map((r) => ({ items: [...r.items] })));
    }
  }, [layout.data, isEditingLayout]);

  const saveLayoutMutation = useMutation({
    mutationFn: dashboardApi.saveLayout,
    onSuccess: (data) => {
      queryClient.setQueryData(['dashboard', 'layout'], data);
      setDraftRows(data.rows.map((r) => ({ items: [...r.items] })));
      setIsEditingLayout(false);
      toast('Dashboard layout saved', 'success');
    },
    onError: (e) => {
      toast(e instanceof Error ? e.message : 'Failed to save layout', 'error');
    },
  });

  useEffect(() => {
    if (stats.data?.asOfDate && !selectedDate) {
      setSelectedDate(stats.data.asOfDate);
    }
  }, [stats.data?.asOfDate, selectedDate]);

  const clickTile = useCallback((tile: DashboardTile) => {
    if (tile === 'total') {
      setActiveTile(null);
      return;
    }
    setActiveTile((prev) => (prev === tile ? null : tile));
  }, []);

  const onStatusFilterChange = useCallback((status: DashboardAttendanceStatusFilter) => {
    setActiveTile(statusToTile(status));
  }, []);

  const resetView = useCallback(() => {
    setActiveTile(null);
    if (charts.data?.asOfDate) {
      setSelectedDate(charts.data.asOfDate);
    } else if (stats.data?.asOfDate) {
      setSelectedDate(stats.data.asOfDate);
    }
  }, [charts.data?.asOfDate, stats.data?.asOfDate]);

  const chartState = useDashboardChartState({
    chartsData: charts.data,
    chartsFetching: charts.isFetching,
    chartsError: charts.error,
    selectedDate,
    onSelectedDateChange: setSelectedDate,
    barMetric,
    statusFilter,
    onStatusFilterChange,
  });

  const renderBlock = useCallback(
    (id: DashboardBlockId) => {
      if (id === 'bar') {
        return (
          <DashboardBarChartCard
            isInitialLoad={chartState.isInitialLoad}
            barChart={chartState.barChart}
            barLabel={chartState.barLabel}
            barMetric={chartState.barMetric}
          />
        );
      }
      if (id === 'donut') {
        return (
          <DashboardDonutChartCard
            isInitialLoad={chartState.isInitialLoad}
            donutRefreshing={chartState.donutRefreshing}
            donutChart={chartState.donutChart}
            donutMeta={chartState.donutMeta}
            selectedDate={chartState.selectedDate}
            punctualityTotal={chartState.punctualityTotal}
            clickLegend={chartState.clickLegend}
            statusFilter={chartState.statusFilter}
            chartsData={chartState.chartsData}
          />
        );
      }
      return (
        <DashboardAttendanceTable
          selectedDate={selectedDate}
          statusFilter={statusFilter}
          onStatusFilterChange={onStatusFilterChange}
        />
      );
    },
    [chartState, selectedDate, statusFilter, onStatusFilterChange]
  );

  const dayIdx = useMemo(() => {
    if (!charts.data || !selectedDate) return -1;
    return charts.data.last7Days.dates.indexOf(selectedDate);
  }, [charts.data, selectedDate]);

  const kpi = useMemo(() => {
    const total = charts.data?.last7Days.totalEmployees ?? stats.data?.employees.active ?? 0;
    const idx =
      dayIdx >= 0
        ? dayIdx
        : charts.data?.last7Days.dates.length
          ? charts.data.last7Days.dates.length - 1
          : -1;
    const present = idx >= 0 ? (charts.data?.last7Days.present[idx] ?? 0) : 0;
    const absent = idx >= 0 ? (charts.data?.last7Days.absent[idx] ?? 0) : 0;
    const late = idx >= 0 ? (charts.data?.last7Days.late[idx] ?? 0) : 0;
    const weekday = selectedDate ? fmtWeekdayShort(selectedDate) : '';
    return { total, present, absent, late, weekday };
  }, [charts.data, stats.data, dayIdx, selectedDate]);

  const asOfDate = stats.data?.asOfDate ?? charts.data?.asOfDate ?? '';
  const isModified =
    activeTile !== null || Boolean(selectedDate && asOfDate && selectedDate !== asOfDate);

  const layoutChanged = !layoutEquals({ rows: draftRows }, { rows: savedRows });

  const startEditLayout = () => {
    setDraftRows(savedRows.map((r) => ({ items: [...r.items] })));
    setIsEditingLayout(true);
  };

  const cancelEditLayout = () => {
    setDraftRows(savedRows.map((r) => ({ items: [...r.items] })));
    setIsEditingLayout(false);
  };

  const saveEditLayout = () => {
    saveLayoutMutation.mutate({ rows: draftRows });
  };

  if (stats.isLoading) return <div className="text-text-muted">Loading...</div>;
  if (stats.error) return <div className="text-red">Failed to load dashboard.</div>;
  const s = stats.data!;

  return (
    <div className="2xl:max-w-[1600px] 2xl:mx-auto">
      <div className="mb-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="text-xs text-text-muted">As of {fmtDate(s.asOfDate)}</div>
      </div>

      {isModified && (
        <div className="dash-filter-bar">
          <span className="dash-filter-bar-label">
            Viewing:{' '}
            <strong>
              {kpi.weekday && kpi.weekday !== '-' ? `${kpi.weekday} (${selectedDate})` : selectedDate}
            </strong>
            {statusFilter !== 'All' && <span> / {statusFilter}</span>}
          </span>
          <button type="button" className="btn-primary btn-sm" onClick={resetView}>
            Reset to Default View
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        <DashboardStatCard
          label="Total Active"
          value={fmtNumber(kpi.total)}
          sub="across active employees"
          accent="primary"
          selected={activeTile === null}
          onClick={() => clickTile('total')}
        />
        <DashboardStatCard
          label={kpi.weekday && kpi.weekday !== '-' ? `Present ${kpi.weekday}` : 'Present Today'}
          value={fmtNumber(kpi.present)}
          sub={kpi.total > 0 ? `${((kpi.present / kpi.total) * 100).toFixed(1)}% attendance` : ''}
          accent="green"
          selected={activeTile === 'present'}
          onClick={() => clickTile('present')}
        />
        <DashboardStatCard
          label={kpi.weekday && kpi.weekday !== '-' ? `Absent ${kpi.weekday}` : 'Absent Today'}
          value={fmtNumber(kpi.absent)}
          sub={kpi.total > 0 ? `${((kpi.absent / kpi.total) * 100).toFixed(1)}% absence` : ''}
          accent="red"
          selected={activeTile === 'absent'}
          onClick={() => clickTile('absent')}
        />
        <DashboardStatCard
          label="Late Arrivals"
          value={fmtNumber(kpi.late)}
          sub="after shift start"
          accent="amber"
          selected={activeTile === 'late'}
          onClick={() => clickTile('late')}
        />
      </div>

      <div className="flex flex-wrap justify-end gap-2 mb-3 dash-layout-toolbar">
        {isEditingLayout ? (
          <>
            <button type="button" className="btn-outline btn-sm" onClick={cancelEditLayout}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={saveEditLayout}
              disabled={!layoutChanged || saveLayoutMutation.isPending}
            >
              {saveLayoutMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </>
        ) : (
          <button type="button" className="btn-outline btn-sm" onClick={startEditLayout}>
            Edit layout
          </button>
        )}
      </div>

      {chartState.chartsError ? (
        <div className="text-red text-sm mb-4">Failed to load charts.</div>
      ) : null}

      <DashboardLayoutEditor
        isEditing={isEditingLayout}
        rows={isEditingLayout ? draftRows : savedRows}
        onRowsChange={setDraftRows}
        renderBlock={renderBlock}
      />
    </div>
  );
}

function DashboardStatCard({
  label,
  value,
  sub,
  accent,
  selected,
  onClick,
}: {
  label: string;
  value: string;
  sub: string;
  accent: 'primary' | 'green' | 'red' | 'amber';
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`dash-stat-card accent-${accent} text-left w-full ${selected ? 'selected' : ''}`}
      onClick={(e) => {
        onClick();
        (e.currentTarget as HTMLButtonElement).blur();
      }}
    >
      <div className="dash-stat-hint">Filters table + chart</div>
      <div className="text-[11px] text-text-subtle font-semibold uppercase tracking-wider">{label}</div>
      <div className="text-3xl font-bold my-1.5 leading-none">{value}</div>
      {sub && <div className="text-xs text-text-muted">{sub}</div>}
    </button>
  );
}
