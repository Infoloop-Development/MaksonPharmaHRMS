import { Doughnut } from 'react-chartjs-2';
import type { AdminOverviewDonutMetric } from '@mams/types';
import { ChartEmptyState } from '../../ui/ChartEmptyState';
import { DONUT_METRIC_LABELS } from '../../../lib/adminOverviewKpiRegistry';
import { fmtDate, fmtNumber, fmtWeekdayShort } from '../../../lib/format';
import { useTheme } from '../../../hooks/useTheme';
import { getChartColors } from '../../../lib/chartColors';
import { BAR_CHART_HEIGHT, DONUT_CHART_SIZE } from './useAdminOverviewChartState';
import type { useAdminOverviewChartState } from './useAdminOverviewChartState';

type ChartState = ReturnType<typeof useAdminOverviewChartState>;

export function AdminOverviewDonutChartCard({
  isInitialLoad,
  donutRefreshing,
  donutChart,
  donutMeta,
  selectedDate,
  punctualityTotal,
  hasChartData,
  donutMetric,
  onDonutMetricChange,
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
  | 'donutMetric'
  | 'onDonutMetricChange'
  | 'chartsData'
>) {
  const { resolvedTheme } = useTheme();
  const CHART_COLORS = getChartColors(resolvedTheme === 'dark');
  const showEmpty = !isInitialLoad && (!hasChartData || punctualityTotal === 0 || !donutChart);

  return (
    <div
      className={`card p-4 md:p-6 h-full flex flex-col transition-opacity duration-150 ${donutRefreshing ? 'opacity-70' : ''}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-1">
        <h2 className="text-lg font-bold">
          {selectedDate ? `${fmtWeekdayShort(selectedDate)} breakdown` : 'Day breakdown'}
        </h2>
        <select
          className="input input-sm w-full sm:w-auto max-w-[220px]"
          value={donutMetric}
          onChange={(e) => onDonutMetricChange(e.target.value as AdminOverviewDonutMetric)}
          aria-label="Donut breakdown metric"
        >
          {(Object.keys(DONUT_METRIC_LABELS) as AdminOverviewDonutMetric[]).map((m) => (
            <option key={m} value={m}>
              {DONUT_METRIC_LABELS[m]}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-text-muted mb-4">
        {chartsData && donutMetric === 'attendance_punctuality'
          ? `${fmtDate(chartsData.weekPunctuality.date)} · ${fmtNumber(chartsData.weekPunctuality.totalActive)} active employees`
          : DONUT_METRIC_LABELS[donutMetric]}
      </p>
      <div
        className={`relative flex flex-1 flex-col md:flex-row items-center justify-center gap-4 md:gap-6 min-h-0 ${BAR_CHART_HEIGHT}`}
      >
        {isInitialLoad && (
          <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm z-10">
            Loading chart…
          </div>
        )}
        {showEmpty && (
          <ChartEmptyState variant="donut" hint="Breakdown appears when data is available for the selected view." />
        )}
        {!showEmpty && donutChart && donutMeta && (
          <>
            <div className={`relative ${DONUT_CHART_SIZE} max-w-[min(100%,160px)] shrink-0`}>
              <Doughnut data={donutChart.data} options={donutChart.options} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="font-bold text-text leading-tight text-xl">{fmtNumber(donutMeta.centerValue)}</div>
                <div className="text-[9px] text-text-subtle">{donutMeta.centerSub}</div>
              </div>
            </div>
            {donutMeta.kind === 'attendance_punctuality' && (
              <div className="flex flex-col gap-1 w-full md:w-auto md:min-w-[120px]">
                <div className="dash-donut-legend-item">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS.navy }} />
                  On time ({fmtNumber(donutMeta.onTime)})
                </div>
                <div className="dash-donut-legend-item">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS.amber }} />
                  Late ({fmtNumber(donutMeta.delay)})
                </div>
                <div className="dash-donut-legend-item">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS.red }} />
                  On leave ({fmtNumber(donutMeta.onLeave)})
                </div>
              </div>
            )}
            {donutMeta.kind === 'users_by_role' && (
              <div className="flex flex-col gap-1 text-sm">
                <div>Org admin: {fmtNumber(donutMeta.roles['org.admin'])}</div>
                <div>HR admin: {fmtNumber(donutMeta.roles['hr.admin'])}</div>
                <div>HR compliance: {fmtNumber(donutMeta.roles['hr.compliance'])}</div>
                <div>IT admin: {fmtNumber(donutMeta.roles['it.admin'])}</div>
              </div>
            )}
            {donutMeta.kind === 'devices_status' && (
              <div className="flex flex-col gap-1 text-sm">
                <div>Online: {fmtNumber(donutMeta.online)}</div>
                <div>Offline: {fmtNumber(donutMeta.offline)}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
