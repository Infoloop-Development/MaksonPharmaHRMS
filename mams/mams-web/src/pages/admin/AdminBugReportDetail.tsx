import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BUG_REPORT_SEVERITY_LABELS,
  canManageBugReports,
} from '@mams/types';
import { useAuth } from '../../store/auth';
import { adminBugReportingApi, BUG_PHASES_QUERY_KEY, BUG_REPORTING_QUERY_KEY } from '../../api/adminBugReporting';
import { usersApi } from '../../api/users';
import { useToast } from '../../components/ui/Toast';
import { Field, Select } from '../../components/ui/Field';
import { Badge } from '../../components/ui/Badge';
import { fmtIstDate } from '../../lib/format';
import { formatBugReportSummary } from '../../lib/bugReport/formatBugReportSummary';
import { BugReportDetailContent } from '../../components/bugReport/BugReportDetailContent';

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

  const { data: phasesData } = useQuery({
    queryKey: BUG_PHASES_QUERY_KEY,
    queryFn: () => adminBugReportingApi.phases.list(),
    enabled: canAccess,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
    enabled: canAccess,
  });

  const [phaseId, setPhaseId] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [deadline, setDeadline] = useState('');

  const patchMu = useMutation({
    mutationFn: (body: Parameters<typeof adminBugReportingApi.patch>[1]) =>
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

  const phases = phasesData?.phases ?? [];
  const currentPhaseId = phaseId || data.phaseId;
  const currentAssignee = assigneeId !== '' ? assigneeId : data.assignee?.id ?? '';
  const currentDeadline = deadline || data.deadline || '';

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

      <div className="card p-4 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Phase">
          <Select
            value={currentPhaseId}
            onChange={(e) => {
              const v = e.target.value;
              setPhaseId(v);
              patchMu.mutate({ phaseId: v });
            }}
          >
            {phases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
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
        <Field label="Deadline">
          <input
            type="date"
            className="input w-full"
            value={currentDeadline}
            onChange={(e) => {
              const v = e.target.value;
              setDeadline(v);
              patchMu.mutate({ deadline: v || null });
            }}
          />
        </Field>
      </div>

      <BugReportDetailContent data={data} />
    </div>
  );
}
