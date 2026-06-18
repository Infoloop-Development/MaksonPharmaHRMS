import { useEffect, useState } from 'react';
import type { AdminChartMetricId, AdminChartType, AdminOverviewWidget, Permission } from '@mams/types';
import { ADMIN_OVERVIEW_WIDGET_MAX } from '@mams/types';
import {
  ALL_CHART_TYPES,
  CHART_TYPE_META,
  METRIC_CATEGORIES,
  METRIC_META,
  getDefaultMetricForChartType,
  getMetricsForChartType,
  metricsByCategory,
} from '../../../lib/adminOverviewChartRegistry';

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
  const [chartType, setChartType] = useState<AdminChartType>(current?.chartType ?? 'bar');
  const [metricId, setMetricId] = useState<AdminChartMetricId>(
    current?.metricId ?? getDefaultMetricForChartType('bar', permissions)
  );

  useEffect(() => {
    if (current) {
      setChartType(current.chartType);
      setMetricId(current.metricId);
    }
  }, [current]);

  useEffect(() => {
    const allowed = getMetricsForChartType(chartType, permissions);
    if (!allowed.includes(metricId)) {
      setMetricId(getDefaultMetricForChartType(chartType, permissions));
    }
  }, [chartType, permissions, metricId]);

  const grouped = metricsByCategory(chartType, permissions);
  const allowedMetrics = getMetricsForChartType(chartType, permissions);

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
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 pb-2 border-b border-border shrink-0">
          <h2 id="admin-widget-picker-title" className="text-sm font-bold">
            Configure chart
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Pick a chart type on the left, then choose the data to display.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">
          <div className="sm:w-[200px] shrink-0 border-b sm:border-b-0 sm:border-r border-border p-2 overflow-y-auto">
            <div className="text-xs font-bold uppercase text-text-muted px-2 py-1 mb-1">Chart type</div>
            <ul className="space-y-1">
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
                          : chartType === type
                            ? 'bg-primary-bg text-primary-on-bg font-semibold'
                            : 'hover:bg-surface2'
                      }`}
                      onClick={() => !disabled && setChartType(type)}
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

          <div className="flex-1 overflow-y-auto p-3 min-h-[200px]">
            {allowedMetrics.length === 0 ? (
              <p className="text-sm text-text-muted p-4 text-center">
                No metrics available for this chart type with your permissions.
              </p>
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
            disabled={allowedMetrics.length === 0}
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
