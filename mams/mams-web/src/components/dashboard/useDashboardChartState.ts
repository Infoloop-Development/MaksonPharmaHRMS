import { useEffect, useMemo, useState } from 'react';
import type {
  ChartEvent,
  ChartOptions,
  ActiveElement,
  TooltipItem,
  ScriptableContext,
} from 'chart.js';
import type { DashboardAttendanceStatusFilter } from '@mams/types';
import '../../lib/chartSetup';
import type { DashboardCharts as DashboardChartsPayload } from '../../api/dashboard';
import type { BarMetric } from '../../pages/Dashboard';
import { fmtDate, fmtNumber, fmtWeekdayShort } from '../../lib/format';

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
};

function dimColor(hex: string, alpha = 0.35): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export interface UseDashboardChartStateProps {
  chartsData: DashboardChartsPayload | undefined;
  chartsFetching: boolean;
  chartsError: Error | null;
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
  barMetric: BarMetric;
  statusFilter: DashboardAttendanceStatusFilter;
  onStatusFilterChange: (s: DashboardAttendanceStatusFilter) => void;
}

export function useDashboardChartState({
  chartsData,
  chartsFetching,
  chartsError,
  selectedDate,
  onSelectedDateChange,
  barMetric,
  statusFilter,
  onStatusFilterChange,
}: UseDashboardChartStateProps) {
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

  const barLabel = barMetric === 'absent' ? 'Absent' : barMetric === 'late' ? 'Late' : 'Present';

  const barChart = useMemo(() => {
    if (!data) return null;
    const labels = data.last7Days.dates.map((d) => fmtWeekdayShort(d));
    const total = data.last7Days.totalEmployees;
    const dayCount = data.last7Days.dates.length;

    const isHighlighted = (i: number) => i === selectedDayIndex || i === hoveredDayIndex;

    const sharedOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      layout: { padding: { top: 18 } },
      datasets: {
        bar: {
          grouped: false,
          categoryPercentage: 0.72,
          barPercentage: 0.88,
        },
      },
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
        if (target) {
          target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
        }
        const idx = elements[0]?.index;
        setHoveredDayIndex(typeof idx === 'number' ? idx : null);
      },
      plugins: {
        legend: { display: false },
      },
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
        y: {
          stacked: false,
          display: false,
          beginAtZero: true,
        },
      },
    } satisfies Partial<ChartOptions<'bar'>>;

    if (barMetric === 'present') {
      const present = data.last7Days.present;
      const barMax = Math.max(...present, 1);

      return {
        data: {
          labels,
          datasets: [
            {
              label: 'Present',
              data: present,
              backgroundColor: (ctx: ScriptableContext<'bar'>) =>
                isHighlighted(ctx.dataIndex) ? CHART_COLORS.navy : CHART_COLORS.presentInactive,
              hoverBackgroundColor: CHART_COLORS.navy,
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
              labels: present.map((p) => fmtNumber(p)),
              selectedIndex: selectedDayIndex,
              hoveredIndex: hoveredDayIndex,
              navy: CHART_COLORS.navy,
              text: CHART_COLORS.text,
            },
            tooltip: {
              callbacks: {
                afterBody: (items: TooltipItem<'bar'>[]) => {
                  const idx = items[0]?.dataIndex ?? 0;
                  const p = present[idx] ?? 0;
                  const pct = total > 0 ? Math.round((p / total) * 100) : 0;
                  const date = data.last7Days.dates[idx];
                  return [
                    date ? fmtDate(date) : '',
                    `Total active: ${fmtNumber(total)}`,
                    `Attendance: ${pct}%`,
                  ].filter(Boolean);
                },
                label: (ctx: TooltipItem<'bar'>) => {
                  const p = present[ctx.dataIndex] ?? 0;
                  return `Present: ${fmtNumber(p)}`;
                },
              },
            },
          },
          scales: {
            ...sharedOptions.scales,
            y: { ...sharedOptions.scales?.y, max: barMax },
          },
        } satisfies ChartOptions<'bar'>,
      };
    }

    const values = barMetric === 'absent' ? data.last7Days.absent : data.last7Days.late;
    const activeColor = barMetric === 'absent' ? CHART_COLORS.red : CHART_COLORS.amber;
    const inactiveColor = barMetric === 'absent' ? CHART_COLORS.redInactive : CHART_COLORS.amberInactive;
    const barMax = Math.max(...values, 1);

    return {
      data: {
        labels,
        datasets: [
          {
            label: barLabel,
            data: values,
            backgroundColor: (ctx: ScriptableContext<'bar'>) =>
              isHighlighted(ctx.dataIndex) ? activeColor : inactiveColor,
            hoverBackgroundColor: activeColor,
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
            navy: activeColor,
            text: CHART_COLORS.text,
          },
          tooltip: {
            callbacks: {
              label: (ctx: TooltipItem<'bar'>) => {
                const val = values[ctx.dataIndex] ?? 0;
                return `${barLabel}: ${fmtNumber(val)}`;
              },
            },
          },
        },
        scales: {
          ...sharedOptions.scales,
          y: { ...sharedOptions.scales?.y, max: barMax },
        },
      } satisfies ChartOptions<'bar'>,
    };
  }, [data, selectedDayIndex, hoveredDayIndex, onSelectedDateChange, barMetric, barLabel]);

  const donutMeta = useMemo(() => {
    if (!data) return null;
    const { onTime, delay, onLeave } = data.weekPunctuality;
    const presentCount = onTime + delay;
    const dayAbsent = data.last7Days.absent[selectedDayIndex] ?? onLeave;
    const dayLate = delay;

    let centerValue = presentCount;
    let centerSub = 'Present';
    if (statusFilter === 'Absent') {
      centerValue = dayAbsent;
      centerSub = 'Absent';
    } else if (statusFilter === 'Late') {
      centerValue = dayLate;
      centerSub = 'Late';
    } else if (statusFilter === 'Present') {
      centerValue = presentCount;
      centerSub = 'Present';
    }

    return { onTime, delay, onLeave, presentCount, dayAbsent, dayLate, centerValue, centerSub };
  }, [data, selectedDayIndex, statusFilter]);

  const donutChart = useMemo(() => {
    if (!data || !donutMeta) return null;
    const { onTime, delay, onLeave } = donutMeta;
    const totalSlices = onTime + delay + onLeave;
    if (totalSlices === 0) return null;

    const all = statusFilter === 'All';
    const isPresent = statusFilter === 'Present';
    const isAbsent = statusFilter === 'Absent';
    const isLate = statusFilter === 'Late';

    const bgColors = [
      all || isPresent ? CHART_COLORS.navy : dimColor(CHART_COLORS.navy),
      all || isLate || isPresent ? CHART_COLORS.amber : dimColor(CHART_COLORS.amber),
      all || isAbsent ? CHART_COLORS.red : dimColor(CHART_COLORS.red),
    ];
    const hoverColors = ['#141f5c', '#d97706', '#c41f1f'];
    const offsets = [isPresent ? 10 : 0, isLate ? 10 : isPresent ? 8 : 0, isAbsent ? 10 : 0];

    return {
      data: {
        labels: ['On time', 'Late', 'Absent'],
        datasets: [
          {
            data: [onTime, delay, onLeave],
            backgroundColor: bgColors,
            hoverBackgroundColor: hoverColors,
            borderWidth: 0,
            borderRadius: 8,
            spacing: 2,
            offset: offsets,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: { duration: 0 },
        cutout: '68%',
        layout: { padding: 0 },
        onClick: (_event: ChartEvent, elements: ActiveElement[]) => {
          const idx = elements[0]?.index;
          if (idx === 0) {
            onStatusFilterChange(statusFilter === 'Present' ? 'All' : 'Present');
          } else if (idx === 1) {
            onStatusFilterChange(statusFilter === 'Late' ? 'All' : 'Late');
          } else if (idx === 2) {
            onStatusFilterChange(statusFilter === 'Absent' ? 'All' : 'Absent');
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx: TooltipItem<'doughnut'>) => {
                const value = typeof ctx.parsed === 'number' ? ctx.parsed : 0;
                const pct = totalSlices > 0 ? Math.round((value / totalSlices) * 100) : 0;
                return `${ctx.label ?? ''}: ${fmtNumber(value)} (${pct}%)`;
              },
            },
          },
        },
      } satisfies ChartOptions<'doughnut'>,
    };
  }, [data, donutMeta, statusFilter, onStatusFilterChange]);

  const clickLegend = (seg: 'present' | 'absent' | 'late') => {
    const map: Record<typeof seg, DashboardAttendanceStatusFilter> = {
      present: 'Present',
      absent: 'Absent',
      late: 'Late',
    };
    const next = map[seg];
    onStatusFilterChange(statusFilter === next ? 'All' : next);
  };

  const punctualityTotal = data
    ? data.weekPunctuality.onTime + data.weekPunctuality.delay + data.weekPunctuality.onLeave
    : 0;

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
    clickLegend,
    statusFilter,
    chartsData: data,
  };
}
