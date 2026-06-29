import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { employeeChangeRequestsApi } from '../api/employeeChangeRequests';
import { useAuth } from '../store/auth';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { SelectField } from '../components/ui/SelectField';
import { EMPTY_CELL, fmtDate } from '../lib/format';
import { ApiError } from '../api/client';

type ChangeRequest = {
  _id: string;
  changeType: 'create' | 'update' | 'delete';
  employeeId: { _id: string; name: string; empCode: string } | null;
  proposedData: Record<string, unknown> | null;
  previousData: Record<string, unknown> | null;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  initiatedBy: { _id: string; name: string; email: string };
  initiatedAt: string;
  decidedBy: { _id: string; name: string } | null;
  decidedAt: string | null;
  approverNote: string | null;
};

const TYPE_TONE: Record<string, 'blue' | 'amber' | 'red'> = {
  create: 'blue',
  update: 'amber',
  delete: 'red',
};

const STATUS_TONE: Record<string, 'amber' | 'green' | 'red'> = {
  Pending: 'amber',
  Approved: 'green',
  Rejected: 'red',
};

function employeeDisplayName(req: ChangeRequest): string {
  if (req.employeeId) return req.employeeId.name;
  if (req.proposedData?.name) return String(req.proposedData.name);
  return EMPTY_CELL;
}

function employeeDisplayCode(req: ChangeRequest): string {
  if (req.employeeId) return req.employeeId.empCode;
  return 'TBD';
}

export function EmployeeChangeRequests() {
  const user = useAuth((s) => s.user);
  const isCompliant = user?.viewMode === 'compliant';
  const canApprove = user?.permissions.includes('approve.employee_change') ?? false;

  const [statusFilter, setStatusFilter] = useState<'Pending' | 'Approved' | 'Rejected' | ''>('Pending');
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [reviewRequest, setReviewRequest] = useState<ChangeRequest | null>(null);
  const qc = useQueryClient();
  const toast = useToast((s) => s.push);

  const { data, isLoading, error } = useQuery({
    queryKey: ['employee-change-requests', { status: statusFilter, page }],
    queryFn: () =>
      employeeChangeRequestsApi.list({
        status: statusFilter || undefined,
        page,
        pageSize,
      }),
  });

  const items = (data?.items ?? []) as unknown as ChangeRequest[];
  const counts = data?.counts ?? { Pending: 0, Approved: 0, Rejected: 0 };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Employee Change Requests</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {isCompliant ? 'Your submitted change requests' : 'Compliance-submitted employee changes awaiting HR review'}
          </p>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="dash-stat-grid mb-6">
        {(['Pending', 'Approved', 'Rejected'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { setStatusFilter(statusFilter === s ? '' : s); setPage(1); }}
            className={`card p-4 text-left transition hover:shadow-md ${statusFilter === s ? 'ring-2 ring-primary' : ''}`}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{s}</div>
            <div className="text-3xl font-bold mt-1">{counts[s]}</div>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="tbl-scroll">
          <table className="w-full text-sm">
            <thead className="bg-surface2">
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Employee</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Submitted by</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-text-muted">Loading…</td></tr>
              )}
              {error && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-red">Failed to load.</td></tr>
              )}
              {!isLoading && items.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-text-muted">No requests found.</td></tr>
              )}
              {items.map((req) => (
                <tr key={req._id} className="hover:bg-surface2/50 transition">
                  <td className="px-4 py-3">
                    <Badge tone={TYPE_TONE[req.changeType]}>
                      {req.changeType.charAt(0).toUpperCase() + req.changeType.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{employeeDisplayName(req)}</div>
                    <div className="text-xs text-text-muted font-mono">{employeeDisplayCode(req)}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-text-muted">
                    {req.initiatedBy?.name ?? EMPTY_CELL}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-text-muted text-xs">
                    {req.initiatedAt ? fmtDate(req.initiatedAt.slice(0, 10)) : EMPTY_CELL}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[req.status]}>{req.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="btn-outline btn-sm"
                      onClick={() => setReviewRequest(req)}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {data && data.total > pageSize && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="text-text-muted">Page {page} of {Math.ceil(data.total / pageSize)}</div>
          <div className="flex gap-2">
            <button className="btn-outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</button>
            <button className="btn-outline" onClick={() => setPage((p) => p + 1)} disabled={page * pageSize >= data.total}>Next</button>
          </div>
        </div>
      )}

      {reviewRequest && (
        <ReviewModal
          request={reviewRequest}
          canApprove={canApprove}
          onClose={() => setReviewRequest(null)}
          onDecided={() => {
            setReviewRequest(null);
            qc.invalidateQueries({ queryKey: ['employee-change-requests'] });
            qc.invalidateQueries({ queryKey: ['employees'] });
          }}
        />
      )}
    </div>
  );
}

function ReviewModal({
  request,
  canApprove,
  onClose,
  onDecided,
}: {
  request: ChangeRequest;
  canApprove: boolean;
  onClose: () => void;
  onDecided: () => void;
}) {
  const [timeShift, setTimeShift] = useState<'Day' | 'Night'>('Day');
  const [approverNote, setApproverNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const toast = useToast((s) => s.push);

  const isPending = request.status === 'Pending';
  const isCreate = request.changeType === 'create';

  const decide = async (decision: 'approve' | 'reject') => {
    setBusy(true);
    setFormError(null);
    try {
      await employeeChangeRequestsApi.decide(request._id, {
        decision,
        approverNote: approverNote.trim() || undefined,
        timeShift: decision === 'approve' && isCreate ? timeShift : undefined,
      });
      toast(decision === 'approve' ? 'Request approved' : 'Request rejected', 'success');
      onDecided();
    } catch (e: unknown) {
      setFormError(e instanceof ApiError ? e.message : 'Could not process decision.');
    } finally {
      setBusy(false);
    }
  };

  const proposed = request.proposedData ?? {};
  const previous = request.previousData ?? {};

  function DataRow({ label, prev, next }: { label: string; prev?: unknown; next?: unknown }) {
    const prevStr = prev != null ? String(prev) : EMPTY_CELL;
    const nextStr = next != null ? String(next) : EMPTY_CELL;
    const changed = prev != null && next != null && prevStr !== nextStr;
    return (
      <tr className={changed ? 'bg-amber-bg/40' : ''}>
        <td className="px-3 py-1.5 text-text-muted text-xs font-medium w-32">{label}</td>
        {request.changeType === 'update' ? (
          <>
            <td className="px-3 py-1.5 text-xs">{prevStr}</td>
            <td className="px-3 py-1.5 text-xs font-medium">{nextStr}</td>
          </>
        ) : (
          <td className="px-3 py-1.5 text-xs font-medium" colSpan={2}>{nextStr || prevStr}</td>
        )}
      </tr>
    );
  }

  const fields: { label: string; key: string }[] = [
    { label: 'Name', key: 'name' },
    { label: 'Dept', key: 'department' },
    { label: 'Designation', key: 'designation' },
    { label: 'Location', key: 'location' },
    { label: 'Comp. shift', key: 'alternateShift' },
    { label: 'Weekly off', key: 'weeklyOff' },
    { label: 'Gender', key: 'gender' },
    { label: 'Join date', key: 'joinDate' },
    { label: 'Status', key: 'status' },
    { label: 'Biometric ID', key: 'biometricId' },
  ];

  return (
    <Modal
      open
      onClose={onClose}
      title={`Review: ${request.changeType.charAt(0).toUpperCase() + request.changeType.slice(1)} request`}
      size="xl"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose} disabled={busy}>Close</button>
          {isPending && canApprove && (
            <>
              <button type="button" className="btn-outline text-red" disabled={busy} onClick={() => decide('reject')}>
                {busy ? 'Processing…' : 'Reject'}
              </button>
              <button type="button" className="btn-primary" disabled={busy} onClick={() => decide('approve')}>
                {busy ? 'Processing…' : 'Approve'}
              </button>
            </>
          )}
        </>
      }
    >
      <div className="space-y-5 text-sm">
        {/* Summary */}
        <div className="flex flex-wrap gap-4 text-xs text-text-muted">
          <span><span className="font-semibold text-text">Employee:</span> {employeeDisplayName(request)} ({employeeDisplayCode(request)})</span>
          <span><span className="font-semibold text-text">Submitted by:</span> {request.initiatedBy?.name}</span>
          <span><span className="font-semibold text-text">Date:</span> {request.initiatedAt ? fmtDate(request.initiatedAt.slice(0, 10)) : EMPTY_CELL}</span>
        </div>

        {/* Reason */}
        <div className="rounded-md border border-border bg-surface2/40 px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Reason</div>
          <p className="text-sm">{request.reason}</p>
        </div>

        {/* Delete: just show what will be removed */}
        {request.changeType === 'delete' && (
          <div className="rounded-md border border-red/30 bg-red-bg px-4 py-3 text-sm text-red">
            This request will permanently remove <strong>{employeeDisplayName(request)}</strong> from the system when approved.
          </div>
        )}

        {/* Create / Update: field comparison table */}
        {request.changeType !== 'delete' && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">
              {request.changeType === 'update' ? 'Proposed changes (highlighted = changed)' : 'Proposed employee data'}
            </div>
            <div className="border border-border rounded overflow-auto max-h-64">
              <table className="w-full">
                <thead className="bg-surface2 sticky top-0">
                  <tr className="text-left text-[10px] uppercase tracking-wider text-text-muted">
                    <th className="px-3 py-2 w-32">Field</th>
                    {request.changeType === 'update' ? (
                      <>
                        <th className="px-3 py-2">Before</th>
                        <th className="px-3 py-2">After</th>
                      </>
                    ) : (
                      <th className="px-3 py-2" colSpan={2}>Value</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {fields.map((f) => (
                    <DataRow
                      key={f.key}
                      label={f.label}
                      prev={previous[f.key]}
                      next={proposed[f.key]}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* HR: assign timeShift on create approval */}
        {isPending && canApprove && isCreate && (
          <div className="rounded-md border border-primary/30 bg-primary-bg px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">
              Assign real time shift (HR only, not visible to compliance)
            </div>
            <SelectField id="review-shift" label="Time shift" value={timeShift} onChange={(v) => setTimeShift(v as 'Day' | 'Night')}>
              <option value="Day">Day (6 AM – 6 PM)</option>
              <option value="Night">Night (6 PM – 6 AM)</option>
            </SelectField>
          </div>
        )}

        {/* Approver note */}
        {isPending && canApprove && (
          <div>
            <label className="label">Approver note (optional)</label>
            <textarea
              className="input w-full min-h-[60px] resize-y"
              placeholder="Add a note for the compliance user…"
              value={approverNote}
              onChange={(e) => setApproverNote(e.target.value)}
            />
          </div>
        )}

        {/* Decided state */}
        {!isPending && (
          <div className="rounded-md border border-border bg-surface2/40 px-4 py-3 text-xs text-text-muted space-y-1">
            <div><span className="font-semibold">Decision:</span> <Badge tone={STATUS_TONE[request.status]}>{request.status}</Badge></div>
            {request.decidedBy && <div><span className="font-semibold">Decided by:</span> {(request.decidedBy as { name?: string }).name ?? EMPTY_CELL}</div>}
            {request.decidedAt && <div><span className="font-semibold">Decided on:</span> {fmtDate(request.decidedAt.slice(0, 10))}</div>}
            {request.approverNote && <div><span className="font-semibold">Note:</span> {request.approverNote}</div>}
          </div>
        )}

        {formError && (
          <div className="text-sm text-red bg-red-bg px-3 py-2 rounded">{formError}</div>
        )}
      </div>
    </Modal>
  );
}
