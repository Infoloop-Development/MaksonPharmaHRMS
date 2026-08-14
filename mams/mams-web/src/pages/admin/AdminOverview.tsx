import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdminOverviewKpiConfig,
  AdminOverviewKpiMetricId,
  AdminOverviewTableConfig,
  AdminOverviewWidget,
  AdminOverviewWidgetsConfig,
  DashboardAttendanceStatusFilter,
  Permission,
} from '@mams/types';
import {
  ADMIN_OVERVIEW_TABLE_COLUMNS,
  DEFAULT_ADMIN_OVERVIEW_KPI,
  DEFAULT_ADMIN_OVERVIEW_TABLE,
  DEFAULT_ADMIN_OVERVIEW_TABLE_COLUMNS,
  DEFAULT_ADMIN_OVERVIEW_WIDGETS,
} from '@mams/types';
import { adminOverviewApi } from '../../api/admin';
import { AdminOverviewKpiGrid } from '../../components/admin/overview/AdminOverviewKpiGrid';
import { AdminOverviewTable } from '../../components/admin/overview/AdminOverviewTable';
import { AdminOverviewTableEditBar } from '../../components/admin/overview/AdminOverviewTableEditBar';
import { AdminOverviewTableColumnPicker } from '../../components/admin/overview/AdminOverviewTableColumnPicker';
import { AdminWidgetGrid, ADMIN_OVERVIEW_WIDGET_MAX } from '../../components/admin/overview/AdminWidgetGrid';
import { AdminWidgetPicker, createNewWidget } from '../../components/admin/overview/AdminWidgetPicker';
import {
  type AdminKpiValues,
  type AdminOverviewKpiFilterState,
  filterAllowedTableKinds,
  kpiMetricToBarMetric,
} from '../../lib/adminOverviewKpiRegistry';
import { fmtDate, fmtWeekdayShort } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../store/auth';
import { ACTIVITY_QUERY_PREFIX } from '../../api/activity';
import { GiveMeATourButton } from '../../components/onboarding/GiveMeATourButton';
import { usePageTourController } from '../../hooks/usePageTourController';
import type { TourPageApi } from '../../lib/onboarding/tourTypes';
import {
  ADMIN_OVERVIEW_TOUR_ACTIONS,
  adminOverviewTourScript,
} from '../../lib/onboarding/scripts/adminOverviewTourScript';

type ConfigureMode = null | 'kpi' | 'charts' | 'table';

function kpiConfigEquals(a: AdminOverviewKpiConfig, b: AdminOverviewKpiConfig): boolean {
  return a.slots.every((s, i) => s === b.slots[i]);
}

function widgetsConfigEquals(a: AdminOverviewWidgetsConfig, b: AdminOverviewWidgetsConfig): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function tableConfigEquals(a: AdminOverviewTableConfig, b: AdminOverviewTableConfig): boolean {
  return a.kind === b.kind && a.columns.every((c, i) => c === b.columns[i]);
}

function invalidateActivity(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ACTIVITY_QUERY_PREFIX });
}

export function AdminOverview() {
  const user = useAuth((s) => s.user);
  const permissions = user?.permissions ?? ([] as Permission[]);
  const toast = useToast((s) => s.push);
  const queryClient = useQueryClient();

  const [configureMode, setConfigureMode] = useState<ConfigureMode>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDayIndex, setSelectedDayIndex] = useState(6);
  const [statusFilter, setStatusFilter] = useState<DashboardAttendanceStatusFilter>('All');
  const [shiftFilter, setShiftFilter] = useState<'All' | 'Day' | 'Night'>('All');
  const [activeKpiMetric, setActiveKpiMetric] = useState<AdminOverviewKpiMetricId | null>(null);
  const [pickerWidgetIndex, setPickerWidgetIndex] = useState<number | null>(null);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [kpiPickerSlot, setKpiPickerSlot] = useState<number | null>(null);
  const tableSectionRef = useRef<HTMLDivElement>(null);
  const pageApiRef = useRef<TourPageApi>({});

  const [draftKpiSlots, setDraftKpiSlots] = useState<AdminOverviewKpiMetricId[]>([
    ...DEFAULT_ADMIN_OVERVIEW_KPI.slots,
  ]);
  const [draftWidgetsConfig, setDraftWidgetsConfig] = useState<AdminOverviewWidgetsConfig>({
    ...DEFAULT_ADMIN_OVERVIEW_WIDGETS,
    widgets: DEFAULT_ADMIN_OVERVIEW_WIDGETS.widgets.map((w) => ({ ...w })),
  });
  const [draftTableConfig, setDraftTableConfig] = useState<AdminOverviewTableConfig>({
    ...DEFAULT_ADMIN_OVERVIEW_TABLE,
    columns: [...DEFAULT_ADMIN_OVERVIEW_TABLE.columns],
  });

  const stats = useQuery({ queryKey: ['admin-overview', 'stats'], queryFn: adminOverviewApi.stats });
  const widgetsConfig = useQuery({
    queryKey: ['admin-overview', 'widgets'],
    queryFn: adminOverviewApi.getWidgets,
  });
  const kpiConfig = useQuery({ queryKey: ['admin-overview', 'kpi'], queryFn: adminOverviewApi.getKpi });
  const tableConfig = useQuery({
    queryKey: ['admin-overview', 'table-config'],
    queryFn: adminOverviewApi.getTableConfig,
  });

  const analytics = useQuery({
    queryKey: ['admin-overview', 'analytics', selectedDate],
    queryFn: () => adminOverviewApi.analytics(selectedDate || undefined),
    enabled: Boolean(selectedDate),
    placeholderData: keepPreviousData,
  });

  const savedKpiSlots = kpiConfig.data?.slots ?? DEFAULT_ADMIN_OVERVIEW_KPI.slots;
  const savedWidgetsConfig = widgetsConfig.data ?? DEFAULT_ADMIN_OVERVIEW_WIDGETS;
  const savedTableConfig = tableConfig.data ?? DEFAULT_ADMIN_OVERVIEW_TABLE;

  const isEditingKpi = configureMode === 'kpi';
  const isEditingCharts = configureMode === 'charts';
  const isEditingTable = configureMode === 'table';
  const isConfiguring = configureMode !== null;

  const displayKpiSlots = isEditingKpi ? draftKpiSlots : savedKpiSlots;
  const displayWidgetsConfig = isEditingCharts ? draftWidgetsConfig : savedWidgetsConfig;
  const displayTableConfig = isEditingTable ? draftTableConfig : savedTableConfig;

  useEffect(() => {
    if (configureMode === 'table') {
      requestAnimationFrame(() => {
        tableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [configureMode]);

  useEffect(() => {
    if (kpiConfig.data && !isEditingKpi) setDraftKpiSlots([...kpiConfig.data.slots]);
  }, [kpiConfig.data, isEditingKpi]);

  useEffect(() => {
    if (widgetsConfig.data && !isEditingCharts) {
      setDraftWidgetsConfig({
        ...widgetsConfig.data,
        widgets: widgetsConfig.data.widgets.map((w) => ({ ...w })),
      });
    }
  }, [widgetsConfig.data, isEditingCharts]);

  useEffect(() => {
    if (tableConfig.data && !isEditingTable) {
      setDraftTableConfig({ ...tableConfig.data, columns: [...tableConfig.data.columns] });
    }
  }, [tableConfig.data, isEditingTable]);

  useEffect(() => {
    if (stats.data?.asOfDate && !selectedDate) setSelectedDate(stats.data.asOfDate);
  }, [stats.data?.asOfDate, selectedDate]);

  useEffect(() => {
    if (!analytics.data?.last7Days.dates.length) return;
    const idx = analytics.data.last7Days.dates.indexOf(selectedDate);
    setSelectedDayIndex(idx >= 0 ? idx : analytics.data.last7Days.dates.length - 1);
  }, [analytics.data?.last7Days.dates, selectedDate]);

  const saveKpiMutation = useMutation({
    mutationFn: adminOverviewApi.saveKpi,
    onSuccess: (data) => {
      queryClient.setQueryData(['admin-overview', 'kpi'], data);
      setDraftKpiSlots([...data.slots]);
      setConfigureMode(null);
      invalidateActivity(queryClient);
      toast('KPI cards saved', 'success');
    },
    onError: (e) => toast(e instanceof Error ? e.message : 'Failed to save KPIs', 'error'),
  });

  const saveWidgetsMutation = useMutation({
    mutationFn: adminOverviewApi.saveWidgets,
    onSuccess: (data) => {
      queryClient.setQueryData(['admin-overview', 'widgets'], data);
      setDraftWidgetsConfig({ ...data, widgets: data.widgets.map((w) => ({ ...w })) });
      setConfigureMode(null);
      invalidateActivity(queryClient);
      toast(`Saved ${data.widgets.length} charts`, 'success');
    },
    onError: (e) => toast(e instanceof Error ? e.message : 'Failed to save charts', 'error'),
  });

  const saveTableMutation = useMutation({
    mutationFn: adminOverviewApi.saveTableConfig,
    onSuccess: (data) => {
      queryClient.setQueryData(['admin-overview', 'table-config'], data);
      setDraftTableConfig({ ...data, columns: [...data.columns] });
      setConfigureMode(null);
      invalidateActivity(queryClient);
      toast('Table settings saved', 'success');
    },
    onError: (e) => toast(e instanceof Error ? e.message : 'Failed to save table', 'error'),
  });

  const filterState: AdminOverviewKpiFilterState = useMemo(
    () => ({
      activeMetric: activeKpiMetric,
      barMetric: kpiMetricToBarMetric(activeKpiMetric),
      donutMetric: 'attendance_punctuality',
    }),
    [activeKpiMetric]
  );

  const dayIdx = selectedDayIndex;
  const kpiValues = useMemo((): AdminKpiValues => {
    const g = stats.data?.governance;
    const hr = stats.data?.hr;
    const d = analytics.data?.last7Days;
    const weekday = selectedDate ? fmtWeekdayShort(selectedDate) : '';
    return {
      governance: {
        activeUsers: g?.activeUsers ?? 0,
        orgAdmins: g?.orgAdmins ?? 0,
        inactiveUsers: g?.inactiveUsers ?? 0,
        devicesOnline: g?.devicesOnline ?? 0,
        devicesOffline: g?.devicesOffline ?? 0,
        devicesTotal: g?.devicesTotal ?? 0,
        auditEvents7d: g?.auditEvents7d ?? 0,
        failedLogins7d: g?.failedLogins7d ?? 0,
        apiOk: g?.apiOk ?? true,
        dbConnected: g?.dbConnected ?? false,
      },
      hr: {
        employeesActive: hr?.employeesActive ?? 0,
        employeesTotal: hr?.employeesTotal ?? 0,
        presentToday: d && dayIdx >= 0 ? (d.present[dayIdx] ?? 0) : (hr?.presentToday ?? 0),
        absentToday: d && dayIdx >= 0 ? (d.absent[dayIdx] ?? 0) : (hr?.absentToday ?? 0),
        attendanceRate: hr?.attendanceRate ?? 0,
        pendingAdjustments: hr?.pendingAdjustments ?? 0,
        onTime: analytics.data?.weekPunctuality.onTime ?? 0,
        weeklyOff: d && dayIdx >= 0 ? (d.weeklyOff[dayIdx] ?? 0) : 0,
        halfDay: d && dayIdx >= 0 ? (d.halfDay[dayIdx] ?? 0) : 0,
        dayShiftPresent: d && dayIdx >= 0 ? (d.dayShiftPresent[dayIdx] ?? 0) : 0,
        nightShiftPresent: d && dayIdx >= 0 ? (d.nightShiftPresent[dayIdx] ?? 0) : 0,
        late: d && dayIdx >= 0 ? (d.late[dayIdx] ?? 0) : 0,
        weekday,
      },
    };
  }, [stats.data, analytics.data, dayIdx, selectedDate]);

  const onDayClick = useCallback(
    (index: number) => {
      const date = analytics.data?.last7Days.dates[index];
      if (date) setSelectedDate(date);
    },
    [analytics.data?.last7Days.dates]
  );

  const resetView = useCallback(() => {
    setActiveKpiMetric(null);
    setStatusFilter('All');
    setShiftFilter('All');
    if (analytics.data?.asOfDate) setSelectedDate(analytics.data.asOfDate);
    else if (stats.data?.asOfDate) setSelectedDate(stats.data.asOfDate);
  }, [analytics.data?.asOfDate, stats.data?.asOfDate]);

  const cancelConfigure = useCallback(() => {
    setDraftKpiSlots([...savedKpiSlots]);
    setDraftWidgetsConfig({
      ...savedWidgetsConfig,
      widgets: savedWidgetsConfig.widgets.map((w) => ({ ...w })),
    });
    setDraftTableConfig({ ...savedTableConfig, columns: [...savedTableConfig.columns] });
    setConfigureMode(null);
    setPickerWidgetIndex(null);
    setShowColumnPicker(false);
    setKpiPickerSlot(null);
  }, [savedKpiSlots, savedTableConfig, savedWidgetsConfig]);

  const closeModals = useCallback(() => {
    setPickerWidgetIndex(null);
    setShowColumnPicker(false);
    setKpiPickerSlot(null);
  }, []);

  const kpiChanged = !kpiConfigEquals({ slots: draftKpiSlots }, { slots: savedKpiSlots });
  const widgetsChanged = !widgetsConfigEquals(draftWidgetsConfig, savedWidgetsConfig);
  const tableChanged = !tableConfigEquals(draftTableConfig, savedTableConfig);
  const allowedTableKinds = filterAllowedTableKinds(permissions);

  const asOfDate = stats.data?.asOfDate ?? analytics.data?.asOfDate ?? '';
  const weekday = selectedDate ? fmtWeekdayShort(selectedDate) : '';
  const isModified =
    activeKpiMetric !== null ||
    statusFilter !== 'All' ||
    shiftFilter !== 'All' ||
    Boolean(selectedDate && asOfDate && selectedDate !== asOfDate);

  const addChart = () => {
    if (draftWidgetsConfig.widgets.length >= ADMIN_OVERVIEW_WIDGET_MAX) return;
    const newIndex = draftWidgetsConfig.widgets.length;
    setDraftWidgetsConfig((prev) => ({
      ...prev,
      widgets: [...prev.widgets, createNewWidget(prev.widgets.length, permissions)],
    }));
    setPickerWidgetIndex(newIndex);
  };

  const updateWidget = (index: number, patch: Pick<AdminOverviewWidget, 'chartType' | 'metricId'>) => {
    setDraftWidgetsConfig((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w, i) => (i === index ? { ...w, ...patch } : w)),
    }));
  };

  const tableSection = displayWidgetsConfig.showTable ? (
    <div
      id="admin-overview-table"
      data-tour-id="admin-overview-table"
      ref={tableSectionRef}
      className="scroll-mt-4"
    >
      {isEditingTable && (
        <AdminOverviewTableEditBar
          kind={draftTableConfig.kind}
          allowedKinds={allowedTableKinds}
          onKindChange={(kind) =>
            setDraftTableConfig((prev) => ({
              ...prev,
              kind,
              columns: [...DEFAULT_ADMIN_OVERVIEW_TABLE_COLUMNS[kind]],
            }))
          }
          onChooseColumns={() => setShowColumnPicker(true)}
        />
      )}
      <AdminOverviewTable
        config={displayTableConfig}
        permissions={permissions}
        selectedDate={selectedDate}
        statusFilter={statusFilter}
        shiftFilter={shiftFilter}
        onStatusFilterChange={setStatusFilter}
        onShiftFilterChange={setShiftFilter}
      />
    </div>
  ) : null;

  const tour = usePageTourController('admin-overview', adminOverviewTourScript, {
    pageApiRef,
    ready: !stats.isLoading && Boolean(stats.data),
    actionMap: ADMIN_OVERVIEW_TOUR_ACTIONS,
    onBeforeStart: () => {
      pageApiRef.current.closeModals?.();
      pageApiRef.current.cancelConfigure?.();
      pageApiRef.current.resetView?.();
    },
  });

  pageApiRef.current = {
    enterConfigureMode: (mode: unknown) => setConfigureMode(mode as ConfigureMode),
    cancelConfigure,
    closeModals,
    resetView,
    demoKpiFilter: () => {
      setActiveKpiMetric('present');
      setStatusFilter('Present');
    },
    openKpiPicker: () => {
      setConfigureMode('kpi');
      setKpiPickerSlot(0);
    },
    openWidgetPicker: () => {
      setConfigureMode('charts');
      setPickerWidgetIndex(0);
    },
    openColumnPicker: () => {
      setConfigureMode('table');
      setShowColumnPicker(true);
    },
    demoShowTable: () => {
      setDraftWidgetsConfig((prev) => ({ ...prev, showTable: true }));
    },
    scrollToTop: () => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    },
    scrollToTable: () => {
      tableSectionRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
    },
  };

  if (stats.isLoading) return <div className="text-text-muted">Loading…</div>;
  if (stats.error) return <div className="text-red">Failed to load admin overview.</div>;

  return (
    <div className="2xl:max-w-[1600px] 2xl:mx-auto">
      <div
        className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3"
        data-tour-id="admin-overview-header"
      >
        <div className="min-w-0 w-full sm:flex-1">
          <h1 className="text-xl sm:text-2xl font-bold break-words">Admin Overview</h1>
          <p className="text-sm text-text-muted mt-1 max-w-prose leading-relaxed">
            Welcome, {user?.name}. Platform governance for{' '}
            {user?.role === 'org.admin' ? 'your organization' : 'delegated admin areas'}.
          </p>
          <div className="text-xs text-text-muted mt-1">As of {fmtDate(asOfDate)}</div>
        </div>
        <div className="flex w-full flex-wrap items-stretch gap-2 sm:mt-0.5 sm:w-auto sm:shrink-0 sm:items-center sm:justify-end">
          <GiveMeATourButton onClick={tour.onReplayTour} className="min-h-11 flex-1 sm:min-h-0 sm:flex-none" />
          {!isConfiguring && (
            <button
              type="button"
              className="btn-outline btn-sm min-h-11 flex-1 whitespace-nowrap sm:min-h-0 sm:flex-none sm:shrink-0"
              data-tour-id="admin-overview-configure-btn"
              onClick={() => setConfigureMode('charts')}
            >
              Configure overview
            </button>
          )}
        </div>
      </div>

      {isConfiguring && (
        <div
          className="card p-3 mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
          data-tour-id="admin-overview-configure-toolbar"
        >
          <span className="text-sm font-semibold sm:mr-auto">Configure overview</span>
          <button
            type="button"
            className={`btn-sm min-h-11 sm:min-h-0 ${configureMode === 'kpi' ? 'btn-primary' : 'btn-outline'}`}
            data-tour-id="admin-overview-tab-kpi"
            onClick={() => setConfigureMode('kpi')}
          >
            Edit KPIs
          </button>
          <button
            type="button"
            className={`btn-sm min-h-11 sm:min-h-0 ${configureMode === 'charts' ? 'btn-primary' : 'btn-outline'}`}
            data-tour-id="admin-overview-tab-charts"
            onClick={() => setConfigureMode('charts')}
          >
            Edit charts
          </button>
          <button
            type="button"
            className={`btn-sm min-h-11 sm:min-h-0 ${configureMode === 'table' ? 'btn-primary' : 'btn-outline'}`}
            data-tour-id="admin-overview-tab-table"
            onClick={() => setConfigureMode('table')}
          >
            Edit table
          </button>
          <button
            type="button"
            className="btn-outline btn-sm min-h-11 sm:min-h-0"
            data-tour-id="admin-overview-configure-cancel"
            onClick={cancelConfigure}
          >
            Cancel
          </button>
          {configureMode === 'kpi' && (
            <button
              type="button"
              className="btn-primary btn-sm min-h-11 sm:min-h-0"
              data-tour-id="admin-overview-save-kpi"
              disabled={!kpiChanged || saveKpiMutation.isPending}
              onClick={() => saveKpiMutation.mutate({ slots: draftKpiSlots })}
            >
              {saveKpiMutation.isPending ? 'Saving…' : 'Save KPIs'}
            </button>
          )}
          {configureMode === 'charts' && (
            <button
              type="button"
              className="btn-primary btn-sm min-h-11 sm:min-h-0"
              data-tour-id="admin-overview-save-charts"
              disabled={!widgetsChanged || saveWidgetsMutation.isPending}
              onClick={() => saveWidgetsMutation.mutate(draftWidgetsConfig)}
            >
              {saveWidgetsMutation.isPending ? 'Saving…' : 'Save charts'}
            </button>
          )}
          {configureMode === 'table' && (
            <button
              type="button"
              className="btn-primary btn-sm min-h-11 sm:min-h-0"
              data-tour-id="admin-overview-save-table"
              disabled={!tableChanged || saveTableMutation.isPending}
              onClick={() => saveTableMutation.mutate(draftTableConfig)}
            >
              {saveTableMutation.isPending ? 'Saving…' : 'Save table'}
            </button>
          )}
        </div>
      )}

      {isEditingCharts && (
        <div data-tour-id="admin-overview-configure-shell">
          <div className="flex flex-wrap gap-2 mb-3 items-center" data-tour-id="admin-overview-charts-layout">
            <span className="text-sm text-text-muted">
              Charts: {draftWidgetsConfig.widgets.length} / {ADMIN_OVERVIEW_WIDGET_MAX} · up to 4 rows
            </span>
            <button
              type="button"
              className="btn-outline btn-sm"
              disabled={draftWidgetsConfig.widgets.length >= ADMIN_OVERVIEW_WIDGET_MAX}
              onClick={addChart}
              data-tour-id="admin-overview-add-chart"
            >
              + Add chart
            </button>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draftWidgetsConfig.showTable}
                onChange={(e) =>
                  setDraftWidgetsConfig((prev) => ({ ...prev, showTable: e.target.checked }))
                }
              />
              Show data table
            </label>
            <select
              className="input input-sm"
              value={draftWidgetsConfig.tablePosition}
              onChange={(e) =>
                setDraftWidgetsConfig((prev) => ({
                  ...prev,
                  tablePosition: e.target.value as 'top' | 'bottom',
                }))
              }
            >
              <option value="bottom">Table below charts</option>
              <option value="top">Table above charts</option>
            </select>
          </div>
        </div>
      )}

      {isModified && (
        <div className="dash-filter-bar mb-3" data-tour-id="admin-overview-filter-bar">
          <span className="dash-filter-bar-label">
            Viewing:{' '}
            <strong>
              {weekday && weekday !== '-' ? `${weekday} (${selectedDate})` : selectedDate}
            </strong>
            {statusFilter !== 'All' && <span> / {statusFilter}</span>}
            {shiftFilter !== 'All' && <span> / {shiftFilter} Shift</span>}
          </span>
          <button type="button" className="btn-primary btn-sm" onClick={resetView}>
            Reset to default view
          </button>
        </div>
      )}

      <AdminOverviewKpiGrid
        slots={displayKpiSlots}
        values={kpiValues}
        filterState={filterState}
        permissions={permissions}
        isEditing={isEditingKpi}
        onSlotsChange={setDraftKpiSlots}
        onFilterChange={(next) => {
          setActiveKpiMetric(next.activeMetric);
          if (next.activeMetric === 'present') setStatusFilter('Present');
          else if (next.activeMetric === 'absent') setStatusFilter('Absent');
          else if (next.activeMetric === 'late') setStatusFilter('Late');
          else if (next.activeMetric === 'day_shift') setShiftFilter('Day');
          else if (next.activeMetric === 'night_shift') setShiftFilter('Night');
          else if (!next.activeMetric) {
            setStatusFilter('All');
            setShiftFilter('All');
          }
        }}
        onCancelEdit={cancelConfigure}
        onSave={() => saveKpiMutation.mutate({ slots: draftKpiSlots })}
        canSave={kpiChanged}
        isSaving={saveKpiMutation.isPending}
        pickerSlot={kpiPickerSlot}
        onPickerSlotChange={setKpiPickerSlot}
      />

      {displayWidgetsConfig.tablePosition === 'top' && tableSection && (
        <div className="mb-4 md:mb-6">{tableSection}</div>
      )}

      <AdminWidgetGrid
        widgets={displayWidgetsConfig.widgets}
        analytics={analytics.data}
        isLoading={analytics.isLoading && !analytics.data}
        selectedDayIndex={selectedDayIndex}
        onDayClick={onDayClick}
        isEditing={isEditingCharts}
        onWidgetsChange={(widgets) => setDraftWidgetsConfig((prev) => ({ ...prev, widgets }))}
        onEditWidget={setPickerWidgetIndex}
        onAddChart={addChart}
        permissions={permissions}
      />

      {displayWidgetsConfig.tablePosition === 'bottom' && tableSection && (
        <div className="mt-4 md:mt-6">{tableSection}</div>
      )}

      {pickerWidgetIndex !== null && (
        <AdminWidgetPicker
          current={draftWidgetsConfig.widgets[pickerWidgetIndex]}
          permissions={permissions}
          onSelect={(patch) => {
            updateWidget(pickerWidgetIndex, patch);
            setPickerWidgetIndex(null);
          }}
          onClose={() => setPickerWidgetIndex(null)}
        />
      )}

      {showColumnPicker && (
        <AdminOverviewTableColumnPicker
          kind={draftTableConfig.kind}
          selectedColumns={draftTableConfig.columns}
          onChange={(columns) => setDraftTableConfig((prev) => ({ ...prev, columns }))}
          onClose={() => setShowColumnPicker(false)}
        />
      )}
    </div>
  );
}
