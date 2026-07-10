import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { BugPhase } from '@mams/types';
import { BUG_REPORT_SEVERITY_LABELS, isBugPublicId } from '@mams/types';
import { adminBugReportingApi, BUG_REPORTING_QUERY_KEY } from '../../api/adminBugReporting';
import { useToast } from '../ui/Toast';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Field';
import { applyBugReportPatchToCache } from '../../lib/bugReport/bugReportingQueryCache';
import { formatBugReportSummary } from '../../lib/bugReport/formatBugReportSummary';
import {
  getBugReportSharePath,
  type BugShareVariant,
} from '../../lib/bugReport/bugShareUrl';
import { BugReportDetailContent } from './BugReportDetailContent';
import { BugReportCommentThread } from './BugReportCommentThread';
import { BugReportActivityTimeline } from './BugReportActivityTimeline';
import { BugReportShareLinkButton } from './BugReportShareLinkButton';

type UserOption = { _id: string; name: string; role?: string };

type Props = {
  reportId: string | null;
  open: boolean;
  onClose: () => void;
  phases: BugPhase[];
  assigneeOptions: UserOption[];
  itAdminOptions: UserOption[];
  /** Base route for share links and URL normalization. */
  shareVariant?: BugShareVariant;
};

function TriageField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-muted whitespace-nowrap shrink-0">{label}</span>
      {children}
    </div>
  );
}

export function BugReportDetailModal({
  reportId,
  open,
  onClose,
  phases,
  assigneeOptions,
  itAdminOptions,
  shareVariant = 'default',
}: Props) {
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: [...BUG_REPORTING_QUERY_KEY, reportId],
    queryFn: () => adminBugReportingApi.getOne(reportId!),
    enabled: open && Boolean(reportId),
  });

  const [phaseId, setPhaseId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    if (!open || !reportId) {
      setPhaseId('');
      setAssigneeId('');
      setDeadline('');
    }
  }, [open, reportId]);

  useEffect(() => {
    if (!open || !data) return;
    setPhaseId(data.phaseId);
    setAssigneeId(data.assignee?.id ?? '');
    setDeadline(data.deadline ?? '');
  }, [open, data?.id, data?.phaseId, data?.assignee?.id, data?.deadline]);

  useEffect(() => {
    if (!open || !data?.publicId || !reportId) return;
    if (isBugPublicId(reportId)) return;
    navigate(getBugReportSharePath(data.publicId, shareVariant), { replace: true });
  }, [open, data?.publicId, reportId, shareVariant, navigate]);

  const patchMu = useMutation({
    mutationFn: (body: Parameters<typeof adminBugReportingApi.patch>[1]) =>
      adminBugReportingApi.patch(reportId!, body),
    onSuccess: (updated) => {
      applyBugReportPatchToCache(qc, updated);
      setPhaseId(updated.phaseId);
      setAssigneeId(updated.assignee?.id ?? '');
      setDeadline(updated.deadline ?? '');
      toast('Bug report updated', 'success');
      void qc.invalidateQueries({ queryKey: BUG_REPORTING_QUERY_KEY });
    },
    onError: (e: unknown) => toast(e instanceof Error ? e.message : 'Update failed', 'error'),
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const onCopyBugSummary = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(formatBugReportSummary(data));
      toast('Bug summary copied to clipboard', 'success');
    } catch {
      toast('Failed to copy to clipboard', 'error');
    }
  };

  const mentionUsers = itAdminOptions.map((u) => ({ id: u._id, name: u.name }));
  const controlClass = 'h-9 text-sm min-w-0';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-lg shadow-floating w-[80vw] max-w-[80vw] max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Bug report details"
      >
        <header className="shrink-0 border-b border-border">
          <div className="flex items-start gap-3 px-5 pt-4 pb-3">
            <div className="min-w-0 flex-1">
              {isLoading ? (
                <p className="text-sm text-text-muted py-1">Loading…</p>
              ) : error || !data ? (
                <p className="text-sm text-red py-1">Failed to load bug report.</p>
              ) : (
                <>
                  <h2 className="text-lg font-bold leading-snug truncate pr-2">{data.title}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {data.publicId ? (
                      <Badge tone="blue">{data.publicId}</Badge>
                    ) : null}
                    <Badge tone={data.severity === 'critical' ? 'red' : data.severity === 'high' ? 'amber' : data.severity === 'medium' ? 'blue' : 'green'}>
                      {BUG_REPORT_SEVERITY_LABELS[data.severity]}
                    </Badge>
                    <span className="text-xs text-text-muted">{data.module}</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-0.5 -mt-0.5">
              {data?.publicId && (
                <BugReportShareLinkButton publicId={data.publicId} shareVariant={shareVariant} />
              )}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-md hover:bg-surface2 text-text-muted flex items-center justify-center shrink-0"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {data && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 bg-surface2/40 border-t border-border/60">
              <TriageField label="Phase">
                <Select
                  className={`${controlClass} w-[9.5rem]`}
                  value={phaseId || data.phaseId}
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
              </TriageField>
              <TriageField label="Assignee">
                <Select
                  className={`${controlClass} w-[9.5rem]`}
                  value={assigneeId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setAssigneeId(v);
                    patchMu.mutate({ assigneeId: v || null });
                  }}
                >
                  <option value="">Unassigned</option>
                  {assigneeOptions.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name}
                    </option>
                  ))}
                </Select>
              </TriageField>
              <TriageField label="Deadline">
                <input
                  type="date"
                  className={`input ${controlClass} w-[9.5rem]`}
                  value={deadline}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDeadline(v);
                    patchMu.mutate({ deadline: v || null });
                  }}
                />
              </TriageField>
              <button
                type="button"
                className="btn-outline btn-sm h-9 ml-auto"
                onClick={() => void onCopyBugSummary()}
              >
                Copy summary
              </button>
            </div>
          )}
        </header>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[2fr_3fr] overflow-hidden">
          <div className="border-b lg:border-b-0 lg:border-r border-border bg-surface2/20 min-h-[220px] lg:min-h-0 flex flex-col overflow-hidden">
            {reportId && <BugReportCommentThread reportId={reportId} mentionUsers={mentionUsers} />}
          </div>
          <div className="p-4 overflow-y-auto min-h-0 space-y-4">
            {data && <BugReportActivityTimeline detail={data} />}
            {data && <BugReportDetailContent data={data} compact />}
          </div>
        </div>
      </div>
    </div>
  );
}
