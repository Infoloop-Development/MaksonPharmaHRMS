import { useCallback, useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  DashboardAttendanceStatusFilter,
  DashboardBlockId,
  DashboardKpiConfig,
  DashboardKpiMetricId,
  DashboardLayoutRow,
  DashboardMobileChart,
} from '@mams/types';
import { DEFAULT_DASHBOARD_KPI, DEFAULT_DASHBOARD_LAYOUT } from '@mams/types';
import { dashboardApi } from '../api/dashboard';
import { DashboardBarChartCard } from '../components/dashboard/DashboardBarChartCard';
import { DashboardDonutChartCard } from '../components/dashboard/DashboardDonutChartCard';
import { DashboardAttendanceTable } from '../components/dashboard/DashboardAttendanceTable';
import { DashboardKpiGrid } from '../components/dashboard/DashboardKpiGrid';
import { DashboardLayoutEditor } from '../components/dashboard/DashboardLayoutEditor';
import { useDashboardChartState } from '../components/dashboard/useDashboardChartState';
import { layoutEquals } from '../lib/dashboardLayout';
import {
  type DashboardKpiFilterState,
  type DashboardShiftFilter,
  kpiMetricToBarMetric,
  syncActiveMetricFromFilters,
} from '../lib/dashboardKpiRegistry';
import { fmtDate, fmtWeekdayShort } from '../lib/format';
import { useToast } from '../components/ui/Toast';
import { useActivityLog } from '../hooks/useActivityLog';
import { ACTIVITY_QUERY_PREFIX } from '../api/activity';

function kpiConfigEquals(a: DashboardKpiConfig, b: DashboardKpiConfig): boolean {
  return a.slots.every((s, i) => s === b.slots[i]);
}

function invalidateActivity(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ACTIVITY_QUERY_PREFIX });
}

export function Dashboard() {
  const toast = useToast((s) => s.push);
  const queryClient = useQueryClient();
  const { logFilterDebounced } = useActivityLog();
  const [selectedDate, setSelectedDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<DashboardAttendanceStatusFilter>('All');
  const [shiftFilter, setShiftFilter] = useState<DashboardShiftFilter>('All');
  const [activeKpiMetric, setActiveKpiMetric] = useState<DashboardKpiMetricId | null>(null);
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [isEditingKpi, setIsEditingKpi] = useState(false);
  const [draftRows, setDraftRows] = useState<DashboardLayoutRow[]>(
    () => DEFAULT_DASHBOARD_LAYOUT.rows.map((r) => ({ items: [...r.items] }))
  );
  const [draftMobileChart, setDraftMobileChart] = useState<DashboardMobileChart>(
    () => DEFAULT_DASHBOARD_LAYOUT.mobileChart ?? 'both'
  );
  const [draftKpiSlots, setDraftKpiSlots] = useState<DashboardKpiMetricId[]>([
    ...DEFAULT_DASHBOARD_KPI.slots,
  ]);

  const filterState: DashboardKpiFilterState = useMemo(
    () => ({ statusFilter, shiftFilter, activeMetric: activeKpiMetric }),
    [statusFilter, shiftFilter, activeKpiMetric]
  );

  const barMetric = kpiMetricToBarMetric(activeKpiMetric);

  const stats = useQuery({ queryKey: ['dashboard', 'stats'], queryFn: dashboardApi.stats });
  const layout = useQuery({ queryKey: ['dashboard', 'layout'], queryFn: dashboardApi.getLayout });
  const kpiConfig = useQuery({ queryKey: ['dashboard', 'kpi'], queryFn: dashboardApi.getKpi });
  const charts = useQuery({
    queryKey: ['dashboard', 'charts', selectedDate],
    queryFn: () => dashboardApi.charts(selectedDate || undefined),
    enabled: Boolean(selectedDate),
    placeholderData: keepPreviousData,
  });

  const savedRows = layout.data?.rows ?? DEFAULT_DASHBOARD_LAYOUT.rows;
  const savedMobileChart = layout.data?.mobileChart ?? DEFAULT_DASHBOARD_LAYOUT.mobileChart ?? 'both';
  const savedKpiSlots = kpiConfig.data?.slots ?? DEFAULT_DASHBOARD_KPI.slots;
  const displayKpiSlots = isEditingKpi ? draftKpiSlots : savedKpiSlots;

  useEffect(() => {
    if (layout.data && !isEditingLayout) {
      setDraftRows(layout.data.rows.map((r) => ({ items: [...r.items] })));
      setDraftMobileChart(layout.data.mobileChart ?? 'both');
    }
  }, [layout.data, isEditingLayout]);

  useEffect(() => {
    if (kpiConfig.data && !isEditingKpi) {
      setDraftKpiSlots([...kpiConfig.data.slots]);
    }
  }, [kpiConfig.data, isEditingKpi]);

  useEffect(() => {
    if (!selectedDate) return;
    logFilterDebounced('dashboard', 'filter', {
      date: selectedDate,
      statusFilter,
      shiftFilter,
    });
  }, [selectedDate, statusFilter, shiftFilter, logFilterDebounced]);

  const saveLayoutMutation = useMutation({
    mutationFn: dashboardApi.saveLayout,
    onSuccess: (data) => {
      queryClient.setQueryData(['dashboard', 'layout'], data);
      setDraftRows(data.rows.map((r) => ({ items: [...r.items] })));
      setDraftMobileChart(data.mobileChart ?? 'both');
      setIsEditingLayout(false);
      invalidateActivity(queryClient);
      toast('Dashboard layout saved', 'success');
    },
    onError: (e) => {
      toast(e instanceof Error ? e.message : 'Failed to save layout', 'error');
    },
  });

  const saveKpiMutation = useMutation({
    mutationFn: dashboardApi.saveKpi,
    onSuccess: (data) => {
      queryClient.setQueryData(['dashboard', 'kpi'], data);
      setDraftKpiSlots([...data.slots]);
      setIsEditingKpi(false);
      invalidateActivity(queryClient);
      toast('KPI cards saved', 'success');
    },
    onError: (e) => {
      toast(e instanceof Error ? e.message : 'Failed to save KPI cards', 'error');
    },
  });

  useEffect(() => {
    if (stats.data?.asOfDate && !selectedDate) {
      setSelectedDate(stats.data.asOfDate);
    }
  }, [stats.data?.asOfDate, selectedDate]);

  const onFilterChange = useCallback((next: DashboardKpiFilterState) => {
    setStatusFilter(next.statusFilter);
    setShiftFilter(next.shiftFilter);
    setActiveKpiMetric(next.activeMetric);
  }, []);

  const onStatusFilterChange = useCallback((status: DashboardAttendanceStatusFilter) => {
    setStatusFilter(status);
    setShiftFilter('All');
    setActiveKpiMetric(syncActiveMetricFromFilters(status, 'All'));
  }, []);

  const onShiftFilterChange = useCallback((shift: DashboardShiftFilter) => {
    setShiftFilter(shift);
    setStatusFilter('All');
    setActiveKpiMetric(syncActiveMetricFromFilters('All', shift));
  }, []);

  const resetView = useCallback(() => {
    setStatusFilter('All');
    setShiftFilter('All');
    setActiveKpiMetric(null);
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
            hasChartData={chartState.hasChartData}
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
            hasChartData={chartState.hasChartData}
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
          shiftFilter={shiftFilter}
          onShiftFilterChange={onShiftFilterChange}
        />
      );
    },
    [
      chartState,
      selectedDate,
      statusFilter,
      shiftFilter,
      onStatusFilterChange,
      onShiftFilterChange,
    ]
  );

  const dayIdx = useMemo(() => {
    if (!charts.data || !selectedDate) return -1;
    return charts.data.last7Days.dates.indexOf(selectedDate);
  }, [charts.data, selectedDate]);

  const kpiValues = useMemo(() => {
    const total = charts.data?.last7Days.totalEmployees ?? stats.data?.employees.active ?? 0;
    const idx =
      dayIdx >= 0
        ? dayIdx
        : charts.data?.last7Days.dates.length
          ? charts.data.last7Days.dates.length - 1
          : -1;
    const weekday = selectedDate ? fmtWeekdayShort(selectedDate) : '';
    return {
      total,
      present: idx >= 0 ? (charts.data?.last7Days.present[idx] ?? 0) : 0,
      absent: idx >= 0 ? (charts.data?.last7Days.absent[idx] ?? 0) : 0,
      late: idx >= 0 ? (charts.data?.last7Days.late[idx] ?? 0) : 0,
      onTime: charts.data?.weekPunctuality.onTime ?? 0,
      weeklyOff: idx >= 0 ? (charts.data?.last7Days.weeklyOff[idx] ?? 0) : 0,
      halfDay: idx >= 0 ? (charts.data?.last7Days.halfDay[idx] ?? 0) : 0,
      dayShiftPresent: idx >= 0 ? (charts.data?.last7Days.dayShiftPresent[idx] ?? 0) : 0,
      nightShiftPresent: idx >= 0 ? (charts.data?.last7Days.nightShiftPresent[idx] ?? 0) : 0,
      weekday,
    };
  }, [charts.data, stats.data, dayIdx, selectedDate]);

  const asOfDate = stats.data?.asOfDate ?? charts.data?.asOfDate ?? '';
  const weekday = selectedDate ? fmtWeekdayShort(selectedDate) : '';
  const isModified =
    statusFilter !== 'All' ||
    shiftFilter !== 'All' ||
    Boolean(selectedDate && asOfDate && selectedDate !== asOfDate);

  const layoutChanged = !layoutEquals(
    { rows: draftRows, mobileChart: draftMobileChart },
    { rows: savedRows, mobileChart: savedMobileChart }
  );
  const kpiChanged = !kpiConfigEquals({ slots: draftKpiSlots }, { slots: savedKpiSlots });

  const startEditLayout = () => {
    if (isEditingKpi) return;
    setDraftRows(savedRows.map((r) => ({ items: [...r.items] })));
    setDraftMobileChart(savedMobileChart);
    setIsEditingLayout(true);
  };

  const cancelEditLayout = () => {
    setDraftRows(savedRows.map((r) => ({ items: [...r.items] })));
    setDraftMobileChart(savedMobileChart);
    setIsEditingLayout(false);
  };

  const saveEditLayout = () => {
    saveLayoutMutation.mutate({ rows: draftRows, mobileChart: draftMobileChart });
  };

  const startEditKpi = () => {
    if (isEditingLayout) return;
    setDraftKpiSlots([...savedKpiSlots]);
    setIsEditingKpi(true);
  };

  const cancelEditKpi = () => {
    setDraftKpiSlots([...savedKpiSlots]);
    setIsEditingKpi(false);
  };

  if (stats.isLoading) return <div className="text-text-muted">Loading...</div>;
  if (stats.error) return <div className="text-red">Failed to load dashboard.</div>;
  const s = stats.data!;

  return (
    <div className="2xl:max-w-[1600px] 2xl:mx-auto">
      <div className="mb-3 flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
          <div className="text-xs text-text-muted">As of {fmtDate(s.asOfDate)}</div>
      </div>
        {!isEditingKpi && !isEditingLayout && (
          <button
            type="button"
            className="dash-kpi-edit-btn shrink-0 mt-0.5"
            aria-label="Customize KPI cards"
            onClick={startEditKpi}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {isModified && (
        <div className="dash-filter-bar">
          <span className="dash-filter-bar-label">
            Viewing:{' '}
            <strong>
              {weekday && weekday !== '-' ? `${weekday} (${selectedDate})` : selectedDate}
            </strong>
            {statusFilter !== 'All' && <span> / {statusFilter}</span>}
            {shiftFilter !== 'All' && <span> / {shiftFilter} Shift</span>}
          </span>
          <button type="button" className="btn-primary btn-sm" onClick={resetView}>
            Reset to Default View
          </button>
                  </div>
      )}

      <DashboardKpiGrid
        slots={displayKpiSlots}
        values={kpiValues}
        filterState={filterState}
        isEditing={isEditingKpi}
        onSlotsChange={setDraftKpiSlots}
        onFilterChange={onFilterChange}
        onCancelEdit={cancelEditKpi}
        onSave={() => saveKpiMutation.mutate({ slots: draftKpiSlots })}
        canSave={kpiChanged}
        isSaving={saveKpiMutation.isPending}
      />

      <div className="flex flex-col sm:flex-row flex-wrap justify-end gap-2 mb-3 dash-layout-toolbar">
        {isEditingLayout ? (
          <>
            <button type="button" className="btn-outline btn-sm dash-layout-toolbar-btn" onClick={cancelEditLayout}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary btn-sm dash-layout-toolbar-btn"
              onClick={saveEditLayout}
              disabled={!layoutChanged || saveLayoutMutation.isPending}
            >
              {saveLayoutMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn-outline btn-sm dash-layout-toolbar-btn"
            onClick={startEditLayout}
            disabled={isEditingKpi}
          >
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
        mobileChart={isEditingLayout ? draftMobileChart : savedMobileChart}
        onRowsChange={setDraftRows}
        onMobileChartChange={setDraftMobileChart}
        renderBlock={renderBlock}
      />
    </div>
  );
}
