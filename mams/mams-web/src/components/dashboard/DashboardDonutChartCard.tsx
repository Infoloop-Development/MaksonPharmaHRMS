import { Doughnut } from 'react-chartjs-2';
import { BAR_CHART_HEIGHT, CHART_COLORS, DONUT_CHART_SIZE } from './useDashboardChartState';
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
  | 'clickLegend'
  | 'statusFilter'
  | 'chartsData'
>) {
  return (
    <div
      className={`card p-4 md:p-6 h-full flex flex-col transition-opacity duration-150 ${donutRefreshing ? 'opacity-70' : ''}`}
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
      <div
        className={`relative flex flex-1 flex-col md:flex-row items-center justify-center gap-4 md:gap-6 min-h-0 ${BAR_CHART_HEIGHT}`}
      >
        {isInitialLoad && (
          <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm">
            Loading chart…
          </div>
        )}
        {!isInitialLoad && punctualityTotal === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-center text-sm text-text-muted px-4">
            No punctuality data for this week. Run{' '}
            <code className="font-mono text-xs bg-surface2 px-1 rounded">npm run seed</code> in{' '}
            <code className="font-mono text-xs bg-surface2 px-1 rounded">mams-server</code> (includes 7+
            days of attendance IST).
          </div>
        )}
        {donutChart && donutMeta && (
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
        {donutMeta && (
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
