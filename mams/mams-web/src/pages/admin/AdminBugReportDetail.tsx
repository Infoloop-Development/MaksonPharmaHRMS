import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BUG_REPORT_SEVERITY_LABELS,
  BUG_REPORT_STATUS_LABELS,
  canManageBugReports,
  type BugReportStatus,
} from '@mams/types';
import { useAuth } from '../../store/auth';
import { adminBugReportingApi, BUG_REPORTING_QUERY_KEY } from '../../api/adminBugReporting';
import { usersApi } from '../../api/users';
import { useToast } from '../../components/ui/Toast';
import { Field, Select } from '../../components/ui/Field';
import { Badge } from '../../components/ui/Badge';
import { fmtIstDate } from '../../lib/format';
import { formatBugReportSummary } from '../../lib/bugReport/formatBugReportSummary';
import { statusLabel } from '../../components/admin/BugReportingTabBar';
import { BugReportVideoPlayer } from '../../components/bugReport/BugReportVideoPlayer';
import { BugReportTranscriptionSection } from '../../components/bugReport/BugReportTranscriptionSection';

function severityTone(severity: string): 'green' | 'amber' | 'red' | 'blue' {
  if (severity === 'critical') return 'red';
  if (severity === 'high') return 'amber';
  if (severity === 'medium') return 'blue';
  return 'green';
}

export function AdminBugReportDetail() {
  const { id = '' } = useParams();
  const user = useAuth((s) => s.user);
  const canAccess = canManageBugReports(user?.permissions ?? []);
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: [...BUG_REPORTING_QUERY_KEY, id],
    queryFn: () => adminBugReportingApi.getOne(id),
    enabled: canAccess && Boolean(id),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
    enabled: canAccess,
  });

  const [status, setStatus] = useState<BugReportStatus | ''>('');
  const [assigneeId, setAssigneeId] = useState<string>('');

  const patchMu = useMutation({
    mutationFn: (body: { status?: BugReportStatus; assigneeId?: string | null }) =>
      adminBugReportingApi.patch(id, body),
    onSuccess: () => {
      toast('Bug report updated', 'success');
      void qc.invalidateQueries({ queryKey: BUG_REPORTING_QUERY_KEY });
    },
    onError: (e: unknown) => toast(e instanceof Error ? e.message : 'Update failed', 'error'),
  });

  if (!canAccess) return <Navigate to="/admin" replace />;
  if (isLoading) return <div className="text-text-muted">Loading…</div>;
  if (error || !data) return <div className="text-red">Failed to load bug report.</div>;

  const currentStatus = status || data.status;
  const currentAssignee = assigneeId !== '' ? assigneeId : data.assignee?.id ?? '';

  const onCopyBugSummary = async () => {
    const text = formatBugReportSummary(data);
    try {
      await navigator.clipboard.writeText(text);
      toast('Bug summary copied to clipboard', 'success');
    } catch {
      toast('Failed to copy to clipboard', 'error');
    }
  };

  const assigneeOptions = (usersData?.items ?? []).filter((u) => u.isActive);

  return (
    <div>
      <div className="mb-4">
        <Link to="/admin/bug-reporting" className="text-sm text-link hover:underline">
          ← Back to bug reports
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{data.title}</h1>
          <p className="text-sm text-text-muted mt-1">
            {data.module} · {data.route} · reported {fmtIstDate(data.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={severityTone(data.severity)}>{BUG_REPORT_SEVERITY_LABELS[data.severity]}</Badge>
          <button type="button" className="btn-outline btn-sm" onClick={() => void onCopyBugSummary()}>
            Copy bug summary
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="xl:col-span-2 card p-4">
          <h2 className="font-semibold text-sm mb-3">Screenshot</h2>
          {data.screenshotDataUrl ? (
            <img src={data.screenshotDataUrl} alt="Bug screenshot" className="max-h-[420px] w-full object-contain rounded-md border border-border" />
          ) : (
            <p className="text-sm text-text-muted">No screenshot attached.</p>
          )}
        </div>
        <div className="card p-4 space-y-4">
          <h2 className="font-semibold text-sm">Triage</h2>
          <Field label="Status">
            <Select
              value={currentStatus}
              onChange={(e) => {
                const v = e.target.value as BugReportStatus;
                setStatus(v);
                patchMu.mutate({ status: v });
              }}
            >
              {(Object.keys(BUG_REPORT_STATUS_LABELS) as BugReportStatus[]).map((s) => (
                <option key={s} value={s}>
                  {BUG_REPORT_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Assignee">
            <Select
              value={currentAssignee}
              onChange={(e) => {
                const v = e.target.value;
                setAssigneeId(v);
                patchMu.mutate({ assigneeId: v || null });
              }}
            >
              <option value="">Unassigned</option>
              {assigneeOptions.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </Select>
          </Field>
          <div className="text-xs text-text-muted space-y-1 pt-2 border-t border-border">
            <div>
              <strong>Reporter:</strong> {data.reporter.name} ({data.reporter.role})
            </div>
            <div>
              <strong>Email:</strong> {data.reporter.email}
            </div>
            <div>
              <strong>Status:</strong> {statusLabel(data.status)}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4 mb-4">
        <h2 className="font-semibold text-sm mb-3">Screen recording</h2>
        {data.hasVideo ? (
          <>
            <BugReportVideoPlayer reportId={data.id} />
            <BugReportTranscriptionSection reportId={data.id} detail={data} />
          </>
        ) : (
          <p className="text-sm text-text-muted">No screen recording attached.</p>
        )}
      </div>

      <div className="card p-4 mb-4">
        <h2 className="font-semibold text-sm mb-2">Description</h2>
        <p className="text-sm whitespace-pre-wrap">{data.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card p-4">
          <h2 className="font-semibold text-sm mb-2">Console log</h2>
          <pre className="text-xs font-mono bg-surface2 p-3 rounded-md max-h-64 overflow-auto whitespace-pre-wrap">
            {data.consoleLog.length
              ? data.consoleLog.map((e) => `[${e.level}] ${e.message}`).join('\n')
              : '(empty)'}
          </pre>
        </div>
        <div className="card p-4">
          <h2 className="font-semibold text-sm mb-2">Breadcrumb trail</h2>
          <ol className="text-xs space-y-1 max-h-64 overflow-auto list-decimal list-inside">
            {data.breadcrumbs.map((b, i) => (
              <li key={`${b.ts}-${i}`}>
                <span className="text-text-muted">{fmtIstDate(b.ts)}</span> — {b.action}
              </li>
            ))}
            {data.breadcrumbs.length === 0 && <li className="list-none text-text-muted">(empty)</li>}
          </ol>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h2 className="font-semibold text-sm mb-2">Failed network requests</h2>
          <pre className="text-xs font-mono bg-surface2 p-3 rounded-md max-h-64 overflow-auto whitespace-pre-wrap">
            {data.failedRequests.length
              ? data.failedRequests
                  .map((r) => `${r.method} ${r.path} → ${r.status}${r.body ? `\n  ${r.body}` : ''}`)
                  .join('\n\n')
              : '(none)'}
          </pre>
        </div>
        <div className="card p-4">
          <h2 className="font-semibold text-sm mb-2">Context</h2>
          <dl className="text-xs space-y-1">
            <div>
              <dt className="text-text-muted inline">Browser: </dt>
              <dd className="inline">{data.context.browser}</dd>
            </div>
            <div>
              <dt className="text-text-muted inline">OS: </dt>
              <dd className="inline">{data.context.os}</dd>
            </div>
            <div>
              <dt className="text-text-muted inline">Viewport: </dt>
              <dd className="inline">{data.context.viewport}</dd>
            </div>
            <div>
              <dt className="text-text-muted inline">Session duration: </dt>
              <dd className="inline">{Math.round(data.context.sessionDurationMs / 1000)}s</dd>
            </div>
            <div>
              <dt className="text-text-muted inline">Role: </dt>
              <dd className="inline">{data.context.role}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
