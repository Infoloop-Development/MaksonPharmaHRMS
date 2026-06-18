import { useMemo } from 'react';
import type { ChartOptions, ScriptableContext, TooltipItem } from 'chart.js';
import type { AdminOverviewAnalyticsPayload, AdminOverviewWidget } from '@mams/types';
import { getMetricLabel, getTrendSeries } from '../../../../lib/adminOverviewChartRegistry';
import { fmtDate, fmtNumber, fmtWeekdayShort } from '../../../../lib/format';
import { useTheme } from '../../../../hooks/useTheme';
import { getAnalyticsColors, type AnalyticsColors } from '../../../../lib/chartColors';

export const CHART_HEIGHT = 'h-[220px]';
export const DONUT_SIZE = 'w-[160px] h-[160px]';

function seriesPalette(colors: AnalyticsColors): string[] {
  return [colors.navy, colors.green, colors.amber, colors.red, colors.purple];
}

function baseCartesianOptions(
  colors: AnalyticsColors,
  onDayClick?: (index: number) => void,
  dayCount = 7,
) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    plugins: { legend: { display: false } },
    onClick: (_e: unknown, elements: { index?: number }[]) => {
      const idx = elements[0]?.index;
      if (typeof idx === 'number' && idx >= 0 && idx < dayCount) onDayClick?.(idx);
    },
    scales: {
      x: { grid: { display: false }, border: { color: colors.border }, ticks: { color: colors.muted } },
      y: { display: false, beginAtZero: true },
    },
  } satisfies Partial<ChartOptions<'bar' | 'line'>>;
}

export function useAdminAnalyticsChart(
  analytics: AdminOverviewAnalyticsPayload | undefined,
  widget: AdminOverviewWidget,
  selectedDayIndex: number,
  onDayClick?: (index: number) => void,
) {
  const { resolvedTheme } = useTheme();

  return useMemo(() => {
    const colors = getAnalyticsColors(resolvedTheme === 'dark');
    if (!analytics) return { chart: null, centerValue: 0, centerSub: '', hasData: false };

    const labels = analytics.last7Days.dates.map((d) => fmtWeekdayShort(d));
    const { chartType, metricId } = widget;

    if (chartType === 'donut' || chartType === 'pie') {
      return buildCircularChart(analytics, metricId, chartType, colors);
    }
    if (chartType === 'horizontal_bar') {
      return buildHorizontalBar(analytics, metricId, colors);
    }
    if (chartType === 'stacked_bar') {
      return buildStackedBar(analytics, metricId, labels, colors, onDayClick);
    }
    if (chartType === 'line') {
      return buildLine(analytics, metricId, labels, colors, onDayClick, selectedDayIndex);
    }
    if (chartType === 'area') {
      return buildArea(analytics, metricId, labels, colors, onDayClick);
    }
    return buildBar(analytics, metricId, labels, colors, onDayClick, selectedDayIndex);
  }, [analytics, widget, selectedDayIndex, onDayClick, resolvedTheme]);
}

function buildCircularChart(
  analytics: AdminOverviewAnalyticsPayload,
  metricId: AdminOverviewWidget['metricId'],
  variant: 'pie' | 'donut',
  colors: AnalyticsColors,
) {
  let labels: string[] = [];
  let values: number[] = [];
  let centerValue = 0;
  let centerSub = '';

  if (metricId === 'attendance_punctuality') {
    const { onTime, delay, onLeave } = analytics.weekPunctuality;
    labels = ['On time', 'Late', 'On leave'];
    values = [onTime, delay, onLeave];
    centerValue = onTime + delay;
    centerSub = 'Present';
  } else if (metricId === 'users_by_role') {
    const r = analytics.breakdowns.usersByRole;
    labels = ['Org admin', 'HR admin', 'HR compliance', 'IT admin'];
    values = [r['org.admin'], r['hr.admin'], r['hr.compliance'], r['it.admin']];
    centerValue = values.reduce((a, b) => a + b, 0);
    centerSub = 'Users';
  } else if (metricId === 'devices_status') {
    const { online, offline } = analytics.breakdowns.devicesStatus;
    labels = ['Online', 'Offline'];
    values = [online, offline];
    centerValue = online;
    centerSub = 'Online';
  } else if (metricId === 'attendance_by_status') {
    const s = analytics.breakdowns.attendanceByStatus;
    labels = ['Present', 'Absent', 'Weekly off', 'Half day', 'Late'];
    values = [s.present, s.absent, s.weeklyOff, s.halfDay, s.late];
    centerValue = s.present;
    centerSub = 'Present';
  } else if (metricId === 'audit_by_module') {
    labels = analytics.breakdowns.auditByModule.map((x) => x.label);
    values = analytics.breakdowns.auditByModule.map((x) => x.value);
    centerValue = values.reduce((a, b) => a + b, 0);
    centerSub = 'Events';
  }

  const total = values.reduce((a, b) => a + b, 0);
  if (total === 0) return { chart: null, centerValue: 0, centerSub: '', hasData: false };

  return {
    type: variant,
    chart: {
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: seriesPalette(colors).slice(0, values.length),
            borderWidth: 0,
            borderRadius: variant === 'pie' ? 4 : 8,
            spacing: variant === 'pie' ? 1 : 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: variant === 'pie' ? '0%' : '68%',
        animation: { duration: 0 },
        plugins: {
          legend: {
            display: variant === 'pie',
            position: 'bottom' as const,
            labels: { boxWidth: 10, font: { size: 10 }, color: colors.text },
          },
          tooltip: {
            callbacks: {
              label: (ctx: TooltipItem<'doughnut'>) => {
                const v = typeof ctx.parsed === 'number' ? ctx.parsed : 0;
                const pct = total > 0 ? Math.round((v / total) * 100) : 0;
                return `${ctx.label}: ${fmtNumber(v)} (${pct}%)`;
              },
            },
          },
        },
      } satisfies ChartOptions<'doughnut'>,
    },
    centerValue,
    centerSub,
    hasData: true,
  };
}

function buildHorizontalBar(
  analytics: AdminOverviewAnalyticsPayload,
  metricId: AdminOverviewWidget['metricId'],
  colors: AnalyticsColors,
) {
  let items: { label: string; value: number }[] = [];
  if (metricId === 'top_departments_present') items = analytics.breakdowns.topDepartmentsPresent;
  else if (metricId === 'users_by_role') {
    const r = analytics.breakdowns.usersByRole;
    items = [
      { label: 'Org admin', value: r['org.admin'] },
      { label: 'HR admin', value: r['hr.admin'] },
      { label: 'HR compliance', value: r['hr.compliance'] },
      { label: 'IT admin', value: r['it.admin'] },
    ];
  } else if (metricId === 'audit_event_types') items = analytics.breakdowns.auditEventTypes;
  else if (metricId === 'devices_by_location') items = analytics.breakdowns.devicesByLocation;
  else if (metricId === 'employees_by_status') items = analytics.breakdowns.employeesByStatus;

  if (!items.length || items.every((x) => x.value === 0)) {
    return { chart: null, centerValue: 0, centerSub: '', hasData: false };
  }

  return {
    type: 'horizontal_bar' as const,
    chart: {
      data: {
        labels: items.map((x) => x.label),
        datasets: [
          {
            data: items.map((x) => x.value),
            backgroundColor: colors.navy,
            borderRadius: 6,
          },
        ],
      },
      options: {
        indexAxis: 'y' as const,
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false, beginAtZero: true },
          y: { grid: { display: false }, ticks: { color: colors.muted } },
        },
      } satisfies ChartOptions<'bar'>,
    },
    centerValue: items[0]?.value ?? 0,
    centerSub: items[0]?.label ?? '',
    hasData: true,
  };
}

function buildStackedBar(
  analytics: AdminOverviewAnalyticsPayload,
  metricId: AdminOverviewWidget['metricId'],
  labels: string[],
  colors: AnalyticsColors,
  onDayClick?: (index: number) => void,
) {
  const d = analytics.last7Days;
  let datasets: { label: string; data: number[]; backgroundColor: string }[] = [];

  if (metricId === 'attendance_status') {
    datasets = [
      { label: 'Present', data: d.present, backgroundColor: colors.navy },
      { label: 'Absent', data: d.absent, backgroundColor: colors.red },
      { label: 'Late', data: d.late, backgroundColor: colors.amber },
    ];
  } else if (metricId === 'login_outcomes') {
    datasets = [
      { label: 'Success', data: d.login_success, backgroundColor: colors.green },
      { label: 'Failed', data: d.login_failed, backgroundColor: colors.red },
    ];
  } else if (metricId === 'shift_present') {
    datasets = [
      { label: 'Day shift', data: d.dayShiftPresent, backgroundColor: colors.navy },
      { label: 'Night shift', data: d.nightShiftPresent, backgroundColor: colors.purple },
    ];
  }

  const hasData = datasets.some((ds) => ds.data.some((v) => v > 0));
  if (!hasData) return { chart: null, centerValue: 0, centerSub: '', hasData: false };

  return {
    type: 'stacked_bar' as const,
    chart: {
      data: { labels, datasets },
      options: {
        ...baseCartesianOptions(colors, onDayClick, labels.length),
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { color: colors.muted } },
          y: { stacked: true, display: false, beginAtZero: true },
        },
        plugins: {
          legend: {
            display: true,
            position: 'bottom' as const,
            labels: { boxWidth: 10, font: { size: 10 }, color: colors.text },
          },
        },
      } satisfies ChartOptions<'bar'>,
    },
    centerValue: 0,
    centerSub: getMetricLabel(metricId),
    hasData: true,
  };
}

function buildLine(
  analytics: AdminOverviewAnalyticsPayload,
  metricId: AdminOverviewWidget['metricId'],
  labels: string[],
  colors: AnalyticsColors,
  onDayClick?: (index: number) => void,
  selectedDayIndex?: number,
) {
  const values = getTrendSeries(analytics, metricId);
  const hasData = values.some((v) => v > 0);
  if (!hasData) return { chart: null, centerValue: 0, centerSub: '', hasData: false };

  return {
    type: 'line' as const,
    chart: {
      data: {
        labels,
        datasets: [
          {
            label: getMetricLabel(metricId),
            data: values,
            borderColor: colors.navy,
            backgroundColor: 'transparent',
            tension: 0.35,
            pointRadius: labels.map((_, i) => (i === selectedDayIndex ? 6 : 4)),
            pointBackgroundColor: labels.map((_, i) =>
              i === selectedDayIndex ? colors.navy : colors.inactive,
            ),
          },
        ],
      },
      options: {
        ...baseCartesianOptions(colors, onDayClick, labels.length),
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterBody: (items: TooltipItem<'line'>[]) => {
                const idx = items[0]?.dataIndex ?? 0;
                const date = analytics.last7Days.dates[idx];
                return date ? [fmtDate(date)] : [];
              },
            },
          },
        },
      } satisfies ChartOptions<'line'>,
    },
    centerValue: values[selectedDayIndex ?? values.length - 1] ?? 0,
    centerSub: getMetricLabel(metricId),
    hasData: true,
  };
}

function buildArea(
  analytics: AdminOverviewAnalyticsPayload,
  metricId: AdminOverviewWidget['metricId'],
  labels: string[],
  colors: AnalyticsColors,
  onDayClick?: (index: number) => void,
) {
  const values = getTrendSeries(analytics, metricId);
  const hasData = values.some((v) => v > 0);
  if (!hasData) return { chart: null, centerValue: 0, centerSub: '', hasData: false };

  const r = parseInt(colors.navy.slice(1, 3), 16);
  const g = parseInt(colors.navy.slice(3, 5), 16);
  const b = parseInt(colors.navy.slice(5, 7), 16);

  return {
    type: 'area' as const,
    chart: {
      data: {
        labels,
        datasets: [
          {
            label: getMetricLabel(metricId),
            data: values,
            borderColor: colors.navy,
            backgroundColor: `rgba(${r},${g},${b},0.15)`,
            fill: true,
            tension: 0.35,
            pointRadius: 3,
          },
        ],
      },
      options: baseCartesianOptions(colors, onDayClick, labels.length) satisfies ChartOptions<'line'>,
    },
    centerValue: values[values.length - 1] ?? 0,
    centerSub: getMetricLabel(metricId),
    hasData: true,
  };
}

function buildBar(
  analytics: AdminOverviewAnalyticsPayload,
  metricId: AdminOverviewWidget['metricId'],
  labels: string[],
  colors: AnalyticsColors,
  onDayClick?: (index: number) => void,
  selectedDayIndex?: number,
) {
  const values = getTrendSeries(analytics, metricId);
  const hasData = values.some((v) => v > 0);
  if (!hasData) return { chart: null, centerValue: 0, centerSub: '', hasData: false };

  const isHighlighted = (i: number) => i === selectedDayIndex;

  return {
    type: 'bar' as const,
    chart: {
      data: {
        labels,
        datasets: [
          {
            label: getMetricLabel(metricId),
            data: values,
            backgroundColor: (ctx: ScriptableContext<'bar'>) =>
              isHighlighted(ctx.dataIndex) ? colors.navy : colors.inactive,
            borderRadius: 8,
          },
        ],
      },
      options: {
        ...baseCartesianOptions(colors, onDayClick, labels.length),
        plugins: {
          legend: { display: false },
          stackedBarValueLabels: {
            labels: values.map((v) => fmtNumber(v)),
            selectedIndex: selectedDayIndex ?? values.length - 1,
            hoveredIndex: null,
            navy: colors.navy,
            text: colors.text,
          },
        },
      } satisfies ChartOptions<'bar'>,
    },
    centerValue: values[selectedDayIndex ?? values.length - 1] ?? 0,
    centerSub: getMetricLabel(metricId),
    hasData: true,
  };
}
