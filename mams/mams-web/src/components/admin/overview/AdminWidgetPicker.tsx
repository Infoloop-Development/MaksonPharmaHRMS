import { useEffect, useState } from 'react';
import type { AdminChartMetricId, AdminChartType, AdminOverviewWidget, Permission } from '@mams/types';
import { ADMIN_OVERVIEW_WIDGET_MAX } from '@mams/types';
import {
  ALL_CHART_TYPES,
  CHART_TYPE_META,
  METRIC_CATEGORIES,
  METRIC_META,
  allMetricsByCategory,
  getAllMetricChartPairs,
  getChartTypeShortLabel,
  getDefaultMetricForChartType,
  getMetricsForChartType,
  metricsByCategory,
} from '../../../lib/adminOverviewChartRegistry';

type PickerView = 'all' | AdminChartType;

export function AdminWidgetPicker({
  current,
  permissions,
  onSelect,
  onClose,
}: {
  current?: AdminOverviewWidget;
  permissions: Permission[];
  onSelect: (widget: Pick<AdminOverviewWidget, 'chartType' | 'metricId'>) => void;
  onClose: () => void;
}) {
  const [pickerView, setPickerView] = useState<PickerView>(current?.chartType ?? 'bar');
  const [chartType, setChartType] = useState<AdminChartType>(current?.chartType ?? 'bar');
  const [metricId, setMetricId] = useState<AdminChartMetricId>(
    current?.metricId ?? getDefaultMetricForChartType('bar', permissions)
  );

  useEffect(() => {
    if (current) {
      setPickerView(current.chartType);
      setChartType(current.chartType);
      setMetricId(current.metricId);
    }
  }, [current]);

  useEffect(() => {
    if (pickerView === 'all') return;
    const allowed = getMetricsForChartType(chartType, permissions);
    if (!allowed.includes(metricId)) {
      setMetricId(getDefaultMetricForChartType(chartType, permissions));
    }
  }, [chartType, permissions, metricId, pickerView]);

  const grouped = metricsByCategory(chartType, permissions);
  const allGrouped = allMetricsByCategory(permissions);
  const allPairs = getAllMetricChartPairs(permissions);
  const allowedMetrics = pickerView === 'all' ? allPairs.map((p) => p.metricId) : getMetricsForChartType(chartType, permissions);
  const hasOptions = pickerView === 'all' ? allPairs.length > 0 : allowedMetrics.length > 0;

  const selectPair = (type: AdminChartType, id: AdminChartMetricId) => {
    setChartType(type);
    setMetricId(id);
  };

  return (
    <div
      className="dash-kpi-picker-overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      role="dialog"
      aria-modal
      aria-labelledby="admin-widget-picker-title"
      onClick={onClose}
    >
      <div
        className="dash-kpi-picker-panel card w-full sm:max-w-2xl max-h-[min(90vh,640px)] overflow-hidden flex flex-col rounded-t-2xl sm:rounded-lg"
        data-tour-id="admin-widget-picker-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 pb-2 border-b border-border shrink-0">
          <h2 id="admin-widget-picker-title" className="text-sm font-bold">
            Configure chart
          </h2>
          <p className="text-xs text-text-muted mt-1">
            {pickerView === 'all'
              ? 'Browse every chart and metric combination, or pick a chart type on the left.'
              : 'Pick a chart type on the left, then choose the data to display.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">
          <div
            className="sm:w-[200px] shrink-0 border-b sm:border-b-0 sm:border-r border-border p-2 overflow-y-auto"
            data-tour-id="admin-widget-picker-types"
          >
            <div className="text-xs font-bold uppercase text-text-muted px-2 py-1 mb-1">Chart type</div>
            <ul className="space-y-1">
              <li>
                <button
                  type="button"
                  disabled={allPairs.length === 0}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                    allPairs.length === 0
                      ? 'opacity-40 cursor-not-allowed'
                      : pickerView === 'all'
                        ? 'bg-primary-bg text-primary-on-bg font-semibold'
                        : 'hover:bg-surface2'
                  }`}
                  onClick={() => allPairs.length > 0 && setPickerView('all')}
                >
                  <span className="mr-1.5">⊞</span>
                  All
                  <span className="block text-[10px] text-text-muted font-normal mt-0.5">
                    {allPairs.length} options
                  </span>
                </button>
              </li>
              {ALL_CHART_TYPES.map((type) => {
                const meta = CHART_TYPE_META[type];
                const count = getMetricsForChartType(type, permissions).length;
                const disabled = count === 0;
                return (
                  <li key={type}>
                    <button
                      type="button"
                      disabled={disabled}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                        disabled
                          ? 'opacity-40 cursor-not-allowed'
                          : pickerView === type
                            ? 'bg-primary-bg text-primary-on-bg font-semibold'
                            : 'hover:bg-surface2'
                      }`}
                      onClick={() => {
                        if (disabled) return;
                        setPickerView(type);
                        setChartType(type);
                      }}
                    >
                      <span className="mr-1.5">{meta.icon}</span>
                      {meta.label}
                      <span className="block text-[10px] text-text-muted font-normal mt-0.5">
                        {count} metrics
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex-1 overflow-y-auto p-3 min-h-[200px]" data-tour-id="admin-widget-picker-metrics">
            {!hasOptions ? (
              <p className="text-sm text-text-muted p-4 text-center">
                No metrics available for this chart type with your permissions.
              </p>
            ) : pickerView === 'all' ? (
              <ul className="space-y-3">
                {METRIC_CATEGORIES.map((cat) => {
                  const items = allGrouped[cat];
                  if (!items.length) return null;
                  return (
                    <li key={cat}>
                      <div className="text-xs font-bold uppercase text-text-muted mb-1 flex items-center gap-2">
                        {cat}
                        <span className="bg-surface2 px-1.5 py-0.5 rounded text-[10px]">{items.length}</span>
                      </div>
                      <ul className="space-y-1">
                        {items.map(({ chartType: type, metricId: id }) => {
                          const selected = chartType === type && metricId === id;
                          return (
                            <li key={`${type}-${id}`}>
                              <button
                                type="button"
                                className={`dash-kpi-picker-option w-full text-left px-3 py-2 rounded text-sm hover:bg-surface2 ${
                                  selected ? 'bg-primary-bg text-primary-on-bg font-semibold' : ''
                                }`}
                                onClick={() => selectPair(type, id)}
                              >
                                <div className="font-medium">
                                  {METRIC_META[id].label}{' '}
                                  <span className="font-normal opacity-80">
                                    ({getChartTypeShortLabel(type)})
                                  </span>
                                </div>
                                <div className="text-xs text-text-muted">{METRIC_META[id].description}</div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <ul className="space-y-3">
                {METRIC_CATEGORIES.map((cat) => {
                  const items = grouped[cat];
                  if (!items.length) return null;
                  return (
                    <li key={cat}>
                      <div className="text-xs font-bold uppercase text-text-muted mb-1 flex items-center gap-2">
                        {cat}
                        <span className="bg-surface2 px-1.5 py-0.5 rounded text-[10px]">{items.length}</span>
                      </div>
                      <ul className="space-y-1">
                        {items.map((id) => (
                          <li key={id}>
                            <button
                              type="button"
                              className={`dash-kpi-picker-option w-full text-left px-3 py-2 rounded text-sm hover:bg-surface2 ${
                                metricId === id ? 'bg-primary-bg text-primary-on-bg font-semibold' : ''
                              }`}
                              onClick={() => setMetricId(id)}
                            >
                              <div className="font-medium">{METRIC_META[id].label}</div>
                              <div className="text-xs text-text-muted">{METRIC_META[id].description}</div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="p-3 border-t border-border shrink-0 flex gap-2">
          <button type="button" className="btn-outline btn-sm flex-1" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary btn-sm flex-1"
            disabled={!hasOptions}
            onClick={() => {
              onSelect({ chartType, metricId });
              onClose();
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export function createNewWidget(
  index: number,
  permissions: Permission[],
  chartType: AdminChartType = 'bar'
): AdminOverviewWidget {
  return {
    id: `w${Date.now()}-${index}`,
    chartType,
    metricId: getDefaultMetricForChartType(chartType, permissions),
  };
}

export { ADMIN_OVERVIEW_WIDGET_MAX };
