import { Bar, Doughnut, Line } from 'react-chartjs-2';
import type { ChartData } from 'chart.js';
import type { AdminOverviewAnalyticsPayload, AdminOverviewWidget } from '@mams/types';
import { ChartEmptyState } from '../../../ui/ChartEmptyState';
import { getChartTypeLabel, getMetricLabel } from '../../../../lib/adminOverviewChartRegistry';
import { fmtNumber } from '../../../../lib/format';
import { DONUT_SIZE, useAdminAnalyticsChart } from './useAdminAnalyticsChart';
import '../../../../lib/chartSetup';

export function AdminChartWidget({
  widget,
  analytics,
  isLoading,
  selectedDayIndex,
  onDayClick,
  isEditing,
  onEdit,
  onRemove,
  tourAnchorId,
}: {
  widget: AdminOverviewWidget;
  analytics: AdminOverviewAnalyticsPayload | undefined;
  isLoading: boolean;
  selectedDayIndex: number;
  onDayClick: (index: number) => void;
  isEditing?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
  tourAnchorId?: string;
}) {
  const result = useAdminAnalyticsChart(analytics, widget, selectedDayIndex, onDayClick);
  const showEmpty = !isLoading && !result.hasData;
  const badge = `${getChartTypeLabel(widget.chartType)} · ${getMetricLabel(widget.metricId)}`;

  const handleCardClick = () => {
    if (isEditing && onEdit) onEdit();
  };

  return (
    <div
      className={`dash-chart-card relative ${isEditing ? 'ring-2 ring-primary/30 cursor-pointer' : ''}`}
      data-tour-id={tourAnchorId}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (isEditing && onEdit && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onEdit();
        }
      }}
      role={isEditing ? 'button' : undefined}
      tabIndex={isEditing ? 0 : undefined}
    >
      {isEditing && (
        <div className="absolute top-2 right-2 flex gap-1 z-10" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="btn-outline btn-sm" onClick={onEdit} aria-label="Edit chart">
            Edit
          </button>
          {onRemove && (
            <button type="button" className="btn-outline btn-sm text-red" onClick={onRemove} aria-label="Remove chart">
              ✕
            </button>
          )}
        </div>
      )}
      <div className="flex items-start justify-between gap-2 pr-20">
        <h3 className="text-sm font-bold">{badge}</h3>
      </div>
      <p className="text-xs text-text-muted mb-3">
        {analytics ? `${analytics.weekRange.start} – ${analytics.weekRange.end}` : 'Loading…'}
        {isEditing && <span className="ml-2 text-primary">· Tap to configure</span>}
      </p>
      <div className="dash-chart-card-body">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm">
            Loading chart…
          </div>
        )}
        {showEmpty && (
          <ChartEmptyState variant="bar" hint="Data will appear once records exist for this metric." />
        )}
        {!showEmpty && result.chart && (result.type === 'donut' || result.type === 'pie') && (
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 h-full">
            <div className={`relative ${DONUT_SIZE} shrink-0`}>
              <Doughnut data={result.chart.data} options={result.chart.options} />
              {result.type === 'donut' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="font-bold text-xl">{fmtNumber(result.centerValue)}</div>
                  <div className="text-[9px] text-text-subtle">{result.centerSub}</div>
                </div>
              )}
            </div>
            {result.type === 'donut' && result.legendItems && (
              <div className="flex flex-col gap-1">
                {result.legendItems.map((item) => (
                  <div key={item.label} className="dash-donut-legend-item">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    {item.label} ({fmtNumber(item.value)})
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {!showEmpty && result.chart && result.type === 'line' && (
          <Line data={result.chart.data as ChartData<'line'>} options={result.chart.options} />
        )}
        {!showEmpty && result.chart && result.type === 'area' && (
          <Line data={result.chart.data as ChartData<'line'>} options={result.chart.options} />
        )}
        {!showEmpty &&
          result.chart &&
          (result.type === 'bar' || result.type === 'stacked_bar' || result.type === 'horizontal_bar') && (
            <Bar
              key={`${widget.id}-${widget.metricId}`}
              data={result.chart.data as ChartData<'bar', number[], string>}
              options={result.chart.options}
            />
          )}
      </div>
    </div>
  );
}
