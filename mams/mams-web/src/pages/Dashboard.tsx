import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard';
import { fmtNumber, fmtDate } from '../lib/format';

export function Dashboard() {
  const stats = useQuery({ queryKey: ['dashboard', 'stats'], queryFn: dashboardApi.stats });
  const trend = useQuery({ queryKey: ['dashboard', 'week'], queryFn: dashboardApi.weekTrend });

  if (stats.isLoading) return <div className="text-text-muted">Loading...</div>;
  if (stats.error) return <div className="text-red">Failed to load dashboard.</div>;
  const s = stats.data!;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="text-sm text-text-muted">As of {fmtDate(s.asOfDate)}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Employees" value={fmtNumber(s.employees.active)} sub={`of ${fmtNumber(s.employees.total)} total`} accent="primary" />
        <StatCard label="Present Today" value={fmtNumber(s.attendanceToday.present)} sub={`${s.attendanceToday.attendanceRate}% attendance rate`} accent="green" />
        <StatCard label="Absent Today" value={fmtNumber(s.attendanceToday.absent)} sub="" accent="red" />
        <StatCard label="Devices Online" value={`${s.devices.online} / ${s.devices.total}`} sub={`${s.pendingAdjustments} pending adjustments`} accent="amber" />
      </div>

      <div className="card p-4 md:p-6">
        <h2 className="text-lg font-bold mb-4">Last 7 days</h2>
        {trend.isLoading && <div className="text-text-muted">Loading...</div>}
        {trend.data && (
          <div className="space-y-2">
            {trend.data.dates.map((d) => {
              const r = trend.data.series[d] ?? { present: 0, absent: 0, weeklyOff: 0 };
              const total = r.present + r.absent + r.weeklyOff;
              const presentPct = total > 0 ? (r.present / total) * 100 : 0;
              return (
                <div key={d} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <div className="w-full sm:w-24 text-xs font-mono text-text-muted shrink-0">{fmtDate(d)}</div>
                  <div className="flex-1 h-7 bg-surface2 rounded-md overflow-hidden flex min-w-0">
                    <div className="bg-green/70" style={{ width: `${presentPct}%` }} title={`${r.present} present`} />
                    <div className="bg-red/40" style={{ width: `${total > 0 ? (r.absent / total) * 100 : 0}%` }} title={`${r.absent} absent`} />
                    <div className="bg-text-subtle/30" style={{ width: `${total > 0 ? (r.weeklyOff / total) * 100 : 0}%` }} title={`${r.weeklyOff} weekly off`} />
                  </div>
                  <div className="w-full sm:w-32 text-xs text-text-muted shrink-0">
                    {r.present} P / {r.absent} A / {r.weeklyOff} WO
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: 'primary' | 'green' | 'red' | 'amber' }) {
  const accentClass = {
    primary: 'border-l-primary',
    green: 'border-l-green',
    red: 'border-l-red',
    amber: 'border-l-amber',
  }[accent];
  return (
    <div className={`card p-5 border-l-4 ${accentClass}`}>
      <div className="text-[11px] text-text-subtle font-semibold uppercase tracking-wider">{label}</div>
      <div className="text-3xl font-bold my-1.5 leading-none">{value}</div>
      <div className="text-xs text-text-muted">{sub}</div>
    </div>
  );
}
