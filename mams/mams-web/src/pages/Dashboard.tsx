import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard';
import { DashboardCharts } from '../components/dashboard/DashboardCharts';
import { fmtNumber, fmtDate } from '../lib/format';

export function Dashboard() {
  const stats = useQuery({ queryKey: ['dashboard', 'stats'], queryFn: dashboardApi.stats });

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

      <DashboardCharts />
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
