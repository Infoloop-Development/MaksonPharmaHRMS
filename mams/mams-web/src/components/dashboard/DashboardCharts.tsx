import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, Pie } from 'react-chartjs-2';
import type { ChartOptions, TooltipItem } from 'chart.js';
import '../../lib/chartSetup';
import { dashboardApi } from '../../api/dashboard';
import { fmtDate, fmtNumber } from '../../lib/format';

const CHART_HEIGHT = 'h-[280px] sm:h-[320px] lg:h-[360px]';

const COLORS = {
  notPresent: '#e2e6ed',
  green: '#73ae25',
  amber: '#f59e0b',
  muted: '#8492a6',
};

export function DashboardCharts() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'charts'],
    queryFn: dashboardApi.charts,
  });

  const barChart = useMemo(() => {
    if (!data) return null;
    const labels = data.last5Days.dates.map((d) => fmtDate(d));
    const total = data.last5Days.totalEmployees;
    const present = data.last5Days.present;
    const notPresent = present.map((p) => Math.max(0, total - p));

    return {
      data: {
        labels,
        datasets: [
          {
            label: 'Present',
            data: present,
            backgroundColor: COLORS.green,
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

  const pieChart = useMemo(() => {
    if (!data) return null;
    const { onTime, delay, onLeave, totalActive } = data.todayPunctuality;
    const totalSlices = onTime + delay + onLeave;
    if (totalSlices === 0) return null;

    return {
      data: {
        labels: ['On time', 'Delay', 'On leave'],
        datasets: [
          {
            data: [onTime, delay, onLeave],
            backgroundColor: [COLORS.green, COLORS.amber, COLORS.muted],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, font: { size: 11 } },
          },
          tooltip: {
            callbacks: {
              label: (ctx: TooltipItem<'pie'>) => {
                const value = typeof ctx.parsed === 'number' ? ctx.parsed : 0;
                const pct = totalActive > 0 ? Math.round((value / totalActive) * 100) : 0;
                return `${ctx.label ?? ''}: ${fmtNumber(value)} (${pct}%)`;
              },
            },
          },
        },
      } satisfies ChartOptions<'pie'>,
    };
  }, [data]);

  const punctualityTotal = data
    ? data.todayPunctuality.onTime + data.todayPunctuality.delay + data.todayPunctuality.onLeave
    : 0;

  if (error) {
    return <div className="text-red text-sm">Failed to load charts.</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      <div className="card p-4 md:p-6">
        <h2 className="text-lg font-bold mb-1">Attendance — last 5 days</h2>
        <p className="text-xs text-text-muted mb-4">
          One bar per day — green = present, gray = remainder of active headcount
        </p>
        <div className={`relative ${CHART_HEIGHT}`}>
          {isLoading && <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm">Loading chart…</div>}
          {barChart && <Bar data={barChart.data} options={barChart.options} />}
        </div>
      </div>

      <div className="card p-4 md:p-6">
        <h2 className="text-lg font-bold mb-1">Today — punctuality</h2>
        <p className="text-xs text-text-muted mb-4">
          As of {data ? fmtDate(data.asOfDate) : '…'} · {data ? fmtNumber(data.todayPunctuality.totalActive) : '—'} active employees
        </p>
        <div className={`relative ${CHART_HEIGHT}`}>
          {isLoading && <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm">Loading chart…</div>}
          {!isLoading && punctualityTotal === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-center text-sm text-text-muted px-4">
              No punctuality data for today. Run <code className="font-mono text-xs bg-surface2 px-1 rounded">npm run seed</code> in{' '}
              <code className="font-mono text-xs bg-surface2 px-1 rounded">mams-server</code> (includes today and tomorrow IST).
            </div>
          )}
          {pieChart && <Pie data={pieChart.data} options={pieChart.options} />}
        </div>
        <ul className="mt-4 space-y-1.5 text-xs text-text-muted border-t border-border pt-3">
          <li className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS.green }} />
            <span><strong className="text-text">Green</strong> — on time (within shift grace: Day by 09:15, Night before 20:00 IST)</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS.amber }} />
            <span><strong className="text-text">Amber</strong> — late entry after grace</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS.muted }} />
            <span><strong className="text-text">Gray</strong> — absent, weekly off, or half day</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
