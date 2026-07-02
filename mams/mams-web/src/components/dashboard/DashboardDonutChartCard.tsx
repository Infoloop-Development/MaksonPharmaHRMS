import { Doughnut } from 'react-chartjs-2';
import { ChartEmptyState } from '../ui/ChartEmptyState';
import { useTheme } from '../../hooks/useTheme';
import { getChartColors } from '../../lib/chartColors';
import { DONUT_CHART_SIZE } from './useDashboardChartState';
import type { useDashboardChartState } from './useDashboardChartState';
import { fmtDate, fmtNumber, fmtWeekdayShort } from '../../lib/format';

type ChartState = ReturnType<typeof useDashboardChartState>;

export function DashboardDonutChartCard({
  isInitialLoad,
  donutRefreshing,
  donutChart,
  donutMeta,
  selectedDate,
  punctualityTotal,
  hasChartData,
  clickLegend,
  statusFilter,
  chartsData,
}: Pick<
  ChartState,
  | 'isInitialLoad'
  | 'donutRefreshing'
  | 'donutChart'
  | 'donutMeta'
  | 'selectedDate'
  | 'punctualityTotal'
  | 'hasChartData'
  | 'clickLegend'
  | 'statusFilter'
  | 'chartsData'
>) {
  const { resolvedTheme } = useTheme();
  const CHART_COLORS = getChartColors(resolvedTheme === 'dark');

  const showEmpty = !isInitialLoad && (!hasChartData || punctualityTotal === 0 || !donutChart);

  return (
    <div
      className={`dash-chart-card transition-opacity duration-150 ${donutRefreshing ? 'opacity-70' : ''}`}
      data-tour-id="dashboard-donut-chart"
    >
      <h2 className="text-lg font-bold mb-1">
        {selectedDate ? `${fmtWeekdayShort(selectedDate)}'s breakdown` : "Day's breakdown"}
      </h2>
      <p className="text-xs text-text-muted mb-4">
        {chartsData
          ? `${fmtDate(chartsData.weekPunctuality.date)} · ${fmtNumber(chartsData.weekPunctuality.totalActive)} active employees`
          : '…'}
        {' · '}Click segments or legend to filter
      </p>
      <div className="dash-chart-card-body flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 min-h-0">
        {isInitialLoad && (
          <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm z-10">
            Loading chart…
          </div>
        )}
        {showEmpty && (
          <ChartEmptyState
            variant="donut"
            hint="Day breakdown appears when attendance is recorded. Run npm run seed in mams-server to load sample data."
          />
        )}
        {!showEmpty && donutChart && donutMeta && (
          <div className={`relative ${DONUT_CHART_SIZE} max-w-[min(100%,160px)] shrink-0`}>
            <Doughnut data={donutChart.data} options={donutChart.options} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div
                className={`font-bold text-text leading-tight ${statusFilter !== 'All' ? 'text-lg' : 'text-xl'}`}
              >
                {fmtNumber(donutMeta.centerValue)}
              </div>
              <div className="text-[9px] text-text-subtle">{donutMeta.centerSub}</div>
            </div>
          </div>
        )}
        {!showEmpty && donutMeta && (
          <div className="flex flex-col gap-1 w-full md:w-auto md:min-w-[120px] items-stretch md:items-start">
            <button
              type="button"
              className={`dash-donut-legend-item ${statusFilter === 'Present' ? 'active' : ''}`}
              onClick={() => clickLegend('present')}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: CHART_COLORS.green }}
              />
              Present ({fmtNumber(donutMeta.presentCount)})
            </button>
            <button
              type="button"
              className={`dash-donut-legend-item ${statusFilter === 'Absent' ? 'active' : ''}`}
              onClick={() => clickLegend('absent')}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: CHART_COLORS.red }}
              />
              Absent ({fmtNumber(donutMeta.dayAbsent)})
            </button>
            <button
              type="button"
              className={`dash-donut-legend-item ${statusFilter === 'Late' ? 'active' : ''}`}
              onClick={() => clickLegend('late')}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: CHART_COLORS.amber }}
              />
              Late ({fmtNumber(donutMeta.dayLate)})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
