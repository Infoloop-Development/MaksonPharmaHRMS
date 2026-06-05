import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, Doughnut } from 'react-chartjs-2';
import type { ChartOptions, TooltipItem } from 'chart.js';
import '../../lib/chartSetup';
import { dashboardApi } from '../../api/dashboard';
import { fmtDate, fmtNumber } from '../../lib/format';

const CHART_HEIGHT = 'h-[280px] sm:h-[320px] lg:h-[360px]';

const COLORS = {
  navy: '#1A2878',
  red: '#E82C2C',
  notPresent: '#e2e6ed',
  muted: '#8492a6',
};

export function DashboardCharts() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'charts'],
    queryFn: dashboardApi.charts,
  });

  const barChart = useMemo(() => {
    if (!data) return null;
    const labels = data.last7Days.dates.map((d) => fmtDate(d));
    const total = data.last7Days.totalEmployees;
    const present = data.last7Days.present;
    const notPresent = present.map((p) => Math.max(0, total - p));

    return {
      data: {
        labels,
        datasets: [
          {
            label: 'Present',
            data: present,
            backgroundColor: COLORS.navy,
            borderRadius: 4,
          },
          {
            label: 'Not present',
            data: notPresent,
            backgroundColor: COLORS.notPresent,
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              afterBody: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                const p = present[idx] ?? 0;
                const pct = total > 0 ? Math.round((p / total) * 100) : 0;
                return [`Total active: ${fmtNumber(total)}`, `Attendance: ${pct}%`];
              },
              label: (ctx: TooltipItem<'bar'>) => {
                const idx = ctx.dataIndex;
                const p = present[idx] ?? 0;
                const np = notPresent[idx] ?? 0;
                if (ctx.datasetIndex === 0) {
                  return `Present: ${fmtNumber(p)}`;
                }
                return `Not present: ${fmtNumber(np)}`;
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            beginAtZero: true,
            max: total > 0 ? total : undefined,
            ticks: { precision: 0 },
          },
          y: {
            stacked: true,
          },
        },
      } satisfies ChartOptions<'bar'>,
    };
  }, [data]);

  const donutChart = useMemo(() => {
    if (!data) return null;
    const { onTime, delay, onLeave, totalActive } = data.weekPunctuality;
    const totalSlices = onTime + delay + onLeave;
    if (totalSlices === 0) return null;

    return {
      data: {
        labels: ['On time', 'Delay', 'On leave'],
        datasets: [
          {
            data: [onTime, delay, onLeave],
            backgroundColor: [COLORS.navy, COLORS.red, COLORS.muted],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '58%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, font: { size: 11 } },
          },
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
  }, [data]);

  const punctualityTotal = data
    ? data.weekPunctuality.onTime + data.weekPunctuality.delay + data.weekPunctuality.onLeave
    : 0;

  if (error) {
    return <div className="text-red text-sm">Failed to load charts.</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      <div className="card p-4 md:p-6">
        <h2 className="text-lg font-bold mb-1">Attendance — last 7 days</h2>
        <p className="text-xs text-text-muted mb-4">
          One bar per day — navy = present, gray = remainder of active headcount
        </p>
        <div className={`relative ${CHART_HEIGHT}`}>
          {isLoading && <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm">Loading chart…</div>}
          {barChart && <Bar data={barChart.data} options={barChart.options} />}
        </div>
      </div>

      <div className="card p-4 md:p-6">
        <h2 className="text-lg font-bold mb-1">Week — punctuality (cumulative)</h2>
        <p className="text-xs text-text-muted mb-4">
          {data
            ? `${fmtDate(data.weekRange.start)} – ${fmtDate(data.weekRange.end)} · ${fmtNumber(data.weekPunctuality.totalActive)} active employees`
            : '…'}
        </p>
        <div className={`relative ${CHART_HEIGHT}`}>
          {isLoading && <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm">Loading chart…</div>}
          {!isLoading && punctualityTotal === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-center text-sm text-text-muted px-4">
              No punctuality data for this week. Run <code className="font-mono text-xs bg-surface2 px-1 rounded">npm run seed</code> in{' '}
              <code className="font-mono text-xs bg-surface2 px-1 rounded">mams-server</code> (includes 7+ days of attendance IST).
            </div>
          )}
          {donutChart && <Doughnut data={donutChart.data} options={donutChart.options} />}
        </div>
        <ul className="mt-4 space-y-1.5 text-xs text-text-muted border-t border-border pt-3">
          <li className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS.navy }} />
            <span><strong className="text-text">Navy</strong> — on time (within shift grace: Day by 09:15, Night before 20:00 IST)</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS.red }} />
            <span><strong className="text-text">Red</strong> — late entry after grace</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS.muted }} />
            <span><strong className="text-text">Gray</strong> — absent, weekly off, or half day (cumulative over the week)</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
