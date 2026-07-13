import type { DashboardLayoutRow, DashboardMobileChart, TablePosition } from '@mams/types';
import { getTablePosition, setTablePosition } from '../../lib/dashboardLayout';

export function DashboardLayoutGuide({
  rows,
  mobileChart,
  onRowsChange,
  onMobileChartChange,
}: {
  rows: DashboardLayoutRow[];
  mobileChart: DashboardMobileChart;
  onRowsChange: (rows: DashboardLayoutRow[]) => void;
  onMobileChartChange: (chart: DashboardMobileChart) => void;
}) {
  const tablePosition = getTablePosition(rows);

  const applyPreset = (position: TablePosition) => {
    onRowsChange(setTablePosition(rows, position));
  };

  return (
    <div className="dash-layout-guide" data-tour-id="dashboard-layout-guide">
      <p className="text-xs text-text-muted mb-4">
        Drag the two charts onto each other to swap their order, or drag the table onto a chart to
        move it above or below. The table always spans full width.
      </p>
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-text-subtle mb-1">
            Table position
          </div>
          <div className="dash-layout-segment shrink-0" role="group" aria-label="Layout preset">
            <button
              type="button"
              className={`dash-layout-segment-btn ${tablePosition === 'bottom' ? 'dash-layout-segment-btn--active' : ''}`}
              onClick={() => applyPreset('bottom')}
            >
              Charts on top
            </button>
            <button
              type="button"
              className={`dash-layout-segment-btn ${tablePosition === 'top' ? 'dash-layout-segment-btn--active' : ''}`}
              onClick={() => applyPreset('top')}
            >
              Table on top
            </button>
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-text-subtle mb-1">
            On phone &amp; tablet (under 1024px), show
          </div>
          <div className="dash-layout-segment shrink-0" role="group" aria-label="Mobile chart">
            <button
              type="button"
              className={`dash-layout-segment-btn ${mobileChart === 'both' ? 'dash-layout-segment-btn--active' : ''}`}
              onClick={() => onMobileChartChange('both')}
            >
              Both charts
            </button>
            <button
              type="button"
              className={`dash-layout-segment-btn ${mobileChart === 'bar' ? 'dash-layout-segment-btn--active' : ''}`}
              onClick={() => onMobileChartChange('bar')}
            >
              Bar only
            </button>
            <button
              type="button"
              className={`dash-layout-segment-btn ${mobileChart === 'donut' ? 'dash-layout-segment-btn--active' : ''}`}
              onClick={() => onMobileChartChange('donut')}
            >
              Donut only
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
