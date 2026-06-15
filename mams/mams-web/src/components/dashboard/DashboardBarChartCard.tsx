import { Bar } from 'react-chartjs-2';
import type { ChartData } from 'chart.js';
import { ChartEmptyState } from '../ui/ChartEmptyState';
import { BAR_CHART_HEIGHT } from './useDashboardChartState';
import type { useDashboardChartState } from './useDashboardChartState';

type ChartState = ReturnType<typeof useDashboardChartState>;

export function DashboardBarChartCard({
  isInitialLoad,
  barChart,
  barLabel,
  barMetric,
  hasChartData,
}: Pick<ChartState, 'isInitialLoad' | 'barChart' | 'barLabel' | 'barMetric' | 'hasChartData'>) {
  const showEmpty = !isInitialLoad && (!barChart || !hasChartData);

  return (
    <div className="card p-4 md:p-6 h-full flex flex-col">
      <h2 className="text-lg font-bold mb-1">Weekly {barLabel} trend</h2>
      <p className="text-xs text-text-muted mb-4">
        Click tile above to switch metric. Click bar to select day.
      </p>
      <div className={`relative ${BAR_CHART_HEIGHT}`}>
        {isInitialLoad && (
          <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm">
            Loading chart…
          </div>
        )}
        {showEmpty && (
          <ChartEmptyState
            variant="bar"
            hint="Weekly attendance trends will appear once punch data is recorded for active employees."
          />
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
