import { DashboardBarChartCard } from './DashboardBarChartCard';
import { DashboardDonutChartCard } from './DashboardDonutChartCard';
import { useDashboardChartState, type UseDashboardChartStateProps } from './useDashboardChartState';

/** Legacy wrapper — dashboard page uses split cards via layout editor. */
export function DashboardCharts(props: UseDashboardChartStateProps) {
  const state = useDashboardChartState(props);

  if (state.chartsError) {
    return <div className="text-red text-sm">Failed to load charts.</div>;
  }

  return (
    <>
      <DashboardBarChartCard
        isInitialLoad={state.isInitialLoad}
        barChart={state.barChart}
        barLabel={state.barLabel}
        barMetric={state.barMetric}
        hasChartData={state.hasChartData}
      />
      <DashboardDonutChartCard
        isInitialLoad={state.isInitialLoad}
        donutRefreshing={state.donutRefreshing}
        donutChart={state.donutChart}
        donutMeta={state.donutMeta}
        selectedDate={state.selectedDate}
        punctualityTotal={state.punctualityTotal}
        hasChartData={state.hasChartData}
        clickLegend={state.clickLegend}
        statusFilter={state.statusFilter}
        chartsData={state.chartsData}
      />
    </>
  );
}
