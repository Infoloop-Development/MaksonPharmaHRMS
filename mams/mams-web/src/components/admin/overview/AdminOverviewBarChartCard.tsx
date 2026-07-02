import { Bar } from 'react-chartjs-2';
import type { ChartData } from 'chart.js';
import { ChartEmptyState } from '../../ui/ChartEmptyState';
import type { useAdminOverviewChartState } from './useAdminOverviewChartState';

type ChartState = ReturnType<typeof useAdminOverviewChartState>;

export function AdminOverviewBarChartCard({
  isInitialLoad,
  barChart,
  barLabel,
  barMetric,
  hasChartData,
}: Pick<ChartState, 'isInitialLoad' | 'barChart' | 'barLabel' | 'barMetric' | 'hasChartData'>) {
  const showEmpty = !isInitialLoad && (!barChart || !hasChartData);

  return (
    <div className="dash-chart-card">
      <h2 className="text-lg font-bold mb-1">Weekly {barLabel} trend</h2>
      <p className="text-xs text-text-muted mb-4">Click a KPI tile to switch metric. Click a bar to select day.</p>
      <div className="dash-chart-card-body">
        {isInitialLoad && (
          <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm">
            Loading chart…
          </div>
        )}
        {showEmpty && (
          <ChartEmptyState variant="bar" hint="7-day trends appear once platform and HR data is available." />
        )}
        {!showEmpty && barChart && (
          <Bar
            key={barMetric}
            data={barChart.data as ChartData<'bar', number[], string>}
            options={barChart.options}
          />
        )}
      </div>
    </div>
  );
}
