import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { BugReportStatsResponse } from '@mams/types';
import { adminBugReportingApi, BUG_REPORTING_QUERY_KEY } from '../../../api/adminBugReporting';
import { Modal } from '../../ui/Modal';
import { DashboardStatCard } from '../../ui/DashboardStatCard';

type Props = {
  open: boolean;
  onClose: () => void;
};

function formatHours(hours: number | null | undefined): string {
  if (hours == null || !Number.isFinite(hours)) return '—';
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

function pct(count: number, total: number): string {
  if (total <= 0) return '0%';
  return `${Math.round((count / total) * 100)}%`;
}

function StatSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="text-sm font-semibold text-text mb-3">{title}</h3>
      {children}
    </section>
  );
}

function BreakdownTable({
  headers,
  rows,
  emptyLabel = 'No data',
}: {
  headers: string[];
  rows: string[][];
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-text-muted">{emptyLabel}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface2/50">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-left font-semibold text-text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-text">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BugReportStatsModal({ open, onClose }: Props) {
  const [raisedFrom, setRaisedFrom] = useState('');
  const [raisedTo, setRaisedTo] = useState('');

  const { data: stats, isLoading } = useQuery({
    queryKey: [...BUG_REPORTING_QUERY_KEY, 'stats', raisedFrom, raisedTo],
    queryFn: () =>
      adminBugReportingApi.stats({
        raisedFrom: raisedFrom || undefined,
        raisedTo: raisedTo || undefined,
      }),
    enabled: open,
  });

  const s: BugReportStatsResponse | undefined = stats;
  const loading = isLoading;
  const rangeSub = raisedFrom || raisedTo ? 'In selected date range' : 'All time';
  const val = (n: number | undefined) => (loading ? '…' : String(n ?? 0));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bug reporting stats"
      size="xl"
      footer={
        <button type="button" className="btn-outline" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-text-muted block mb-1">Start Date</label>
          <input
            type="date"
            className="input w-full h-9 text-sm"
            value={raisedFrom}
            onChange={(e) => setRaisedFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-text-muted block mb-1">End Date</label>
          <input
            type="date"
            className="input w-full h-9 text-sm"
            value={raisedTo}
            onChange={(e) => setRaisedTo(e.target.value)}
          />
          <p className="text-[11px] text-text-muted mt-1">
            Most stats count bugs raised in this period. Leave empty for all time.
          </p>
        </div>
      </div>

      <StatSection title="Overview">
        <div className="dash-stat-grid">
          <DashboardStatCard
            label="Total Bugs Raised"
            value={val(s?.totalRaised)}
            sub={rangeSub}
            accent="primary"
            selected={false}
            onClick={() => undefined}
          />
          <DashboardStatCard
            label="Total Open"
            value={val(s?.totalOpen)}
            sub="Not in resolved phase"
            accent="amber"
            selected={false}
            onClick={() => undefined}
          />
          <DashboardStatCard
            label="Total Solved"
            value={val(s?.totalSolved)}
            sub="Currently in resolved phase"
            accent="green"
            selected={false}
            onClick={() => undefined}
            tooltip="Snapshot of bugs raised in range that are now in a resolved Kanban column."
          />
          <DashboardStatCard
            label="Unassigned"
            value={val(s?.unassigned)}
            sub="Open with no assignee"
            accent="amber"
            selected={false}
            onClick={() => undefined}
          />
          <DashboardStatCard
            label="Critical Open"
            value={val(s?.criticalOpen)}
            sub="Critical severity, not resolved"
            accent="red"
            selected={false}
            onClick={() => undefined}
          />
          <DashboardStatCard
            label="Overdue"
            value={val(s?.overdue)}
            sub="Past deadline, not resolved"
            accent="red"
            selected={false}
            onClick={() => undefined}
          />
        </div>
      </StatSection>

      <StatSection title="By severity">
        <div className="dash-stat-grid">
          {(['low', 'medium', 'high', 'critical'] as const).map((severity) => (
            <DashboardStatCard
              key={severity}
              label={severity.charAt(0).toUpperCase() + severity.slice(1)}
              value={val(s?.bySeverity[severity])}
              sub={rangeSub}
              accent={severity === 'critical' ? 'red' : severity === 'high' ? 'amber' : 'primary'}
              selected={false}
              onClick={() => undefined}
            />
          ))}
        </div>
      </StatSection>

      <StatSection title="Resolution">
        <div className="dash-stat-grid">
          <DashboardStatCard
            label="Resolved in range"
            value={val(s?.resolvedInRange)}
            sub="Entered resolved phase in period"
            accent="green"
            selected={false}
            onClick={() => undefined}
            tooltip="Uses status history: counts bugs moved to a resolved phase during the selected dates."
          />
          <DashboardStatCard
            label="Avg resolution time"
            value={loading ? '…' : formatHours(s?.avgResolutionHours)}
            sub="Raised → first resolved"
            accent="primary"
            selected={false}
            onClick={() => undefined}
          />
          <DashboardStatCard
            label="Median resolution time"
            value={loading ? '…' : formatHours(s?.medianResolutionHours)}
            sub="Among currently resolved"
            accent="primary"
            selected={false}
            onClick={() => undefined}
          />
        </div>
      </StatSection>

      <StatSection title="Media and activity">
        <div className="dash-stat-grid">
          <DashboardStatCard
            label="With video"
            value={val(s?.withVideo)}
            sub={rangeSub}
            accent="primary"
            selected={false}
            onClick={() => undefined}
          />
          <DashboardStatCard
            label="With screenshot"
            value={val(s?.withScreenshot)}
            sub={rangeSub}
            accent="primary"
            selected={false}
            onClick={() => undefined}
          />
          <DashboardStatCard
            label="With attachments"
            value={val(s?.withAttachments)}
            sub={rangeSub}
            accent="primary"
            selected={false}
            onClick={() => undefined}
          />
          <DashboardStatCard
            label="Total comments"
            value={val(s?.totalComments)}
            sub="On bugs in range"
            accent="primary"
            selected={false}
            onClick={() => undefined}
          />
          <DashboardStatCard
            label="Bugs with comments"
            value={val(s?.bugsWithComments)}
            sub={rangeSub}
            accent="primary"
            selected={false}
            onClick={() => undefined}
          />
          <DashboardStatCard
            label="Unique reporters"
            value={val(s?.uniqueReporters)}
            sub={rangeSub}
            accent="primary"
            selected={false}
            onClick={() => undefined}
          />
        </div>
      </StatSection>

      <StatSection title="By Kanban phase">
        <BreakdownTable
          headers={['Phase', 'Count', '% of raised', 'Status']}
          rows={(s?.byPhase ?? []).map((row) => [
            row.label,
            String(row.count),
            pct(row.count, s?.totalRaised ?? 0),
            row.isResolvedState ? 'Resolved' : 'Open',
          ])}
        />
      </StatSection>

      <StatSection title="By module (top 10)">
        <BreakdownTable
          headers={['Module', 'Count']}
          rows={(s?.byModule ?? []).map((row) => [row.module, String(row.count)])}
        />
      </StatSection>

      <StatSection title="By assignee">
        <BreakdownTable
          headers={['Assignee', 'Count']}
          rows={(s?.byAssignee ?? []).map((row) => [row.name, String(row.count)])}
        />
      </StatSection>

      <StatSection title="Top reporters">
        <BreakdownTable
          headers={['Reporter', 'Bugs filed']}
          rows={(s?.topReporters ?? []).map((row) => [row.name, String(row.count)])}
        />
      </StatSection>
    </Modal>
  );
}
