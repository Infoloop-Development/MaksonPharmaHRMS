import { useEffect, useMemo, useState } from 'react';
import type {
  ActiveElement,
  ChartEvent,
  ChartOptions,
  ScriptableContext,
  TooltipItem,
} from 'chart.js';
import type { AdminOverviewBarMetric, AdminOverviewChartsPayload, AdminOverviewDonutMetric } from '@mams/types';
import '../../../lib/chartSetup';
import { BAR_METRIC_LABELS } from '../../../lib/adminOverviewKpiRegistry';
import { fmtDate, fmtNumber, fmtWeekdayShort } from '../../../lib/format';

export const BAR_CHART_HEIGHT = 'h-[200px]';
export const DONUT_CHART_SIZE = 'w-[160px] h-[160px]';
const BAR_RADIUS = 10;
const LAST_DAY_INDEX = 6;

const ROUNDED_ALL = {
  topLeft: BAR_RADIUS,
  topRight: BAR_RADIUS,
  bottomLeft: BAR_RADIUS,
  bottomRight: BAR_RADIUS,
};

export const CHART_COLORS = {
  navy: '#1A2878',
  presentInactive: '#B0BFD8',
  red: '#E82C2C',
  redInactive: '#f5a8a8',
  amber: '#f59e0b',
  amberInactive: '#fcd9a0',
  muted: '#8492a6',
  text: '#1a1f36',
  border: '#e2e6ed',
  green: '#73ae25',
  purple: '#6366f1',
};

function dimColor(hex: string, alpha = 0.35): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function barSeries(data: AdminOverviewChartsPayload, metric: AdminOverviewBarMetric): number[] {
  return data.last7Days[metric];
}

function barColors(metric: AdminOverviewBarMetric): { active: string; inactive: string } {
  if (metric === 'absent' || metric === 'login_failed') {
    return { active: CHART_COLORS.red, inactive: CHART_COLORS.redInactive };
  }
  if (metric === 'late' || metric === 'audit_events') {
    return { active: CHART_COLORS.amber, inactive: CHART_COLORS.amberInactive };
  }
  if (metric === 'devices_online') {
    return { active: CHART_COLORS.green, inactive: dimColor(CHART_COLORS.green, 0.35) };
  }
  if (metric === 'users_active' || metric === 'login_success') {
    return { active: CHART_COLORS.purple, inactive: dimColor(CHART_COLORS.purple, 0.35) };
  }
  return { active: CHART_COLORS.navy, inactive: CHART_COLORS.presentInactive };
}

export interface UseAdminOverviewChartStateProps {
  chartsData: AdminOverviewChartsPayload | undefined;
  chartsFetching: boolean;
  chartsError: Error | null;
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
  barMetric: AdminOverviewBarMetric;
  donutMetric: AdminOverviewDonutMetric;
  onDonutMetricChange: (metric: AdminOverviewDonutMetric) => void;
}

export function useAdminOverviewChartState({
  chartsData,
  chartsFetching,
  chartsError,
  selectedDate,
  onSelectedDateChange,
  barMetric,
  donutMetric,
  onDonutMetricChange,
}: UseAdminOverviewChartStateProps) {
  const data = chartsData;
  const isInitialLoad = !data && chartsFetching;
  const donutRefreshing = chartsFetching && Boolean(data);

  const [selectedDayIndex, setSelectedDayIndex] = useState(LAST_DAY_INDEX);
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!data?.last7Days.dates.length) return;
    const idx = data.last7Days.dates.indexOf(selectedDate);
    setSelectedDayIndex(idx >= 0 ? idx : LAST_DAY_INDEX);
    setHoveredDayIndex(null);
  }, [data?.last7Days.dates.join(','), selectedDate]);

  useEffect(() => {
    if (!data?.last7Days.dates.length) return;
    const todayDate = data.last7Days.dates[LAST_DAY_INDEX];
    if (!selectedDate && todayDate) {
      onSelectedDateChange(todayDate);
    }
  }, [data?.last7Days.dates.join(','), selectedDate, onSelectedDateChange]);

  const barLabel = BAR_METRIC_LABELS[barMetric];

  const barChart = useMemo(() => {
    if (!data) return null;
    const labels = data.last7Days.dates.map((d) => fmtWeekdayShort(d));
    const values = barSeries(data, barMetric);
    const dayCount = data.last7Days.dates.length;
    const { active, inactive } = barColors(barMetric);
    const barMax = Math.max(...values, 1);

    const isHighlighted = (i: number) => i === selectedDayIndex || i === hoveredDayIndex;

    const sharedOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      layout: { padding: { top: 18 } },
      datasets: { bar: { grouped: false, categoryPercentage: 0.72, barPercentage: 0.88 } },
      onClick: (_event: ChartEvent, elements: ActiveElement[]) => {
        const idx = elements[0]?.index;
        if (typeof idx === 'number' && idx >= 0 && idx < dayCount) {
          setSelectedDayIndex(idx);
          const date = data.last7Days.dates[idx];
          if (date) onSelectedDateChange(date);
        }
      },
      onHover: (event: ChartEvent, elements: ActiveElement[]) => {
        const target = event.native?.target as HTMLElement | undefined;
        if (target) target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
        const idx = elements[0]?.index;
        setHoveredDayIndex(typeof idx === 'number' ? idx : null);
      },
      plugins: { legend: { display: false } },
      scales: {
        x: {
          stacked: false,
          grid: { display: false },
          border: { display: true, color: CHART_COLORS.border },
          ticks: {
            color: (ctx: { index: number }) =>
              isHighlighted(ctx.index) ? CHART_COLORS.navy : CHART_COLORS.muted,
            font: (ctx: { index: number }) => ({
              size: 11,
              weight: isHighlighted(ctx.index) ? ('bold' as const) : ('normal' as const),
            }),
          },
        },
        y: { stacked: false, display: false, beginAtZero: true, max: barMax },
      },
    } satisfies Partial<ChartOptions<'bar'>>;

    return {
      data: {
        labels,
        datasets: [
          {
            label: barLabel,
            data: values,
            backgroundColor: (ctx: ScriptableContext<'bar'>) =>
              isHighlighted(ctx.dataIndex) ? active : inactive,
            hoverBackgroundColor: active,
            borderWidth: 0,
            borderRadius: ROUNDED_ALL,
          },
        ],
      },
      options: {
        ...sharedOptions,
        plugins: {
          legend: { display: false },
          stackedBarValueLabels: {
            labels: values.map((v) => fmtNumber(v)),
            selectedIndex: selectedDayIndex,
            hoveredIndex: hoveredDayIndex,
            navy: active,
            text: CHART_COLORS.text,
          },
          tooltip: {
            callbacks: {
              label: (ctx: TooltipItem<'bar'>) => {
                const val = values[ctx.dataIndex] ?? 0;
                return `${barLabel}: ${fmtNumber(val)}`;
              },
              afterBody: (items: TooltipItem<'bar'>[]) => {
                const idx = items[0]?.dataIndex ?? 0;
                const date = data.last7Days.dates[idx];
                return date ? [fmtDate(date)] : [];
              },
            },
          },
        },
      } satisfies ChartOptions<'bar'>,
    };
  }, [data, selectedDayIndex, hoveredDayIndex, onSelectedDateChange, barMetric, barLabel]);

  const donutMeta = useMemo(() => {
    if (!data) return null;

    if (donutMetric === 'users_by_role') {
      const roles = data.usersByRole;
      const total = Object.values(roles).reduce((a, b) => a + b, 0);
      return { kind: 'users_by_role' as const, roles, total, centerValue: total, centerSub: 'Active users' };
    }

    if (donutMetric === 'devices_status') {
      const { online, offline } = data.devicesStatus;
      const total = online + offline;
      return {
        kind: 'devices_status' as const,
        online,
        offline,
        total,
        centerValue: online,
        centerSub: 'Online',
      };
    }

    const { onTime, delay, onLeave } = data.weekPunctuality;
    const presentCount = onTime + delay;
    return {
      kind: 'attendance_punctuality' as const,
      onTime,
      delay,
      onLeave,
      presentCount,
      centerValue: presentCount,
      centerSub: 'Present',
    };
  }, [data, donutMetric]);

  const donutChart = useMemo(() => {
    if (!data || !donutMeta) return null;

    if (donutMeta.kind === 'users_by_role') {
      const { roles, total } = donutMeta;
      if (total === 0) return null;
      const labels = ['Org admin', 'HR admin', 'HR compliance', 'IT admin'];
      const values = [roles['org.admin'], roles['hr.admin'], roles['hr.compliance'], roles['it.admin']];
      return {
        data: {
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: [CHART_COLORS.navy, CHART_COLORS.green, CHART_COLORS.amber, CHART_COLORS.purple],
              borderWidth: 0,
              borderRadius: 8,
              spacing: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          animation: { duration: 0 },
          cutout: '68%',
          plugins: { legend: { display: false } },
        } satisfies ChartOptions<'doughnut'>,
      };
    }

    if (donutMeta.kind === 'devices_status') {
      const { online, offline, total } = donutMeta;
      if (total === 0) return null;
      return {
        data: {
          labels: ['Online', 'Offline'],
          datasets: [
            {
              data: [online, offline],
              backgroundColor: [CHART_COLORS.green, CHART_COLORS.red],
              borderWidth: 0,
              borderRadius: 8,
              spacing: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          animation: { duration: 0 },
          cutout: '68%',
          plugins: { legend: { display: false } },
        } satisfies ChartOptions<'doughnut'>,
      };
    }

    const { onTime, delay, onLeave } = donutMeta;
    const totalSlices = onTime + delay + onLeave;
    if (totalSlices === 0) return null;

    return {
      data: {
        labels: ['On time', 'Late', 'On leave'],
        datasets: [
          {
            data: [onTime, delay, onLeave],
            backgroundColor: [CHART_COLORS.navy, CHART_COLORS.amber, CHART_COLORS.red],
            hoverBackgroundColor: ['#141f5c', '#d97706', '#c41f1f'],
            borderWidth: 0,
            borderRadius: 8,
            spacing: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: { duration: 0 },
        cutout: '68%',
        plugins: { legend: { display: false } },
      } satisfies ChartOptions<'doughnut'>,
    };
  }, [data, donutMeta]);

  const punctualityTotal = donutMeta?.kind === 'attendance_punctuality'
    ? donutMeta.onTime + donutMeta.delay + donutMeta.onLeave
    : donutMeta?.total ?? 0;

  const hasChartData = Boolean(data && (data.last7Days.totalEmployees > 0 || barMetric.startsWith('users') || barMetric.startsWith('audit') || barMetric.startsWith('login') || barMetric.startsWith('devices')));

  return {
    chartsError,
    isInitialLoad,
    donutRefreshing,
    barChart,
    barLabel,
    barMetric,
    donutChart,
    donutMeta,
    selectedDate,
    punctualityTotal,
    hasChartData,
    donutMetric,
    onDonutMetricChange,
    chartsData: data,
  };
}
