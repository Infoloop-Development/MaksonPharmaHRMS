import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { employeeChangeRequestsApi } from '../api/employeeChangeRequests';
import { useAuth } from '../store/auth';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { SelectField } from '../components/ui/SelectField';
import { fmtDate } from '../lib/format';
import { ApiError } from '../api/client';

type ChangeRequest = {
  _id: string;
  changeType: 'create' | 'update' | 'delete';
  employeeId: { _id: string; name: string; empCode: string; isDeleted?: boolean } | null;
  proposedData: Record<string, unknown> | null;
  previousData: Record<string, unknown> | null;
  reason: string;
  status: 'Flagged' | 'Reviewed';
  initiatedBy: { _id: string; name: string; email: string };
  initiatedAt: string;
  reviewedBy: { _id: string; name: string } | null;
  reviewedAt: string | null;
  reviewNote: string | null;
};

const TYPE_TONE: Record<string, 'blue' | 'amber' | 'red'> = {
  create: 'blue',
  update: 'amber',
  delete: 'red',
};

const STATUS_TONE: Record<string, 'amber' | 'green'> = {
  Flagged: 'amber',
  Reviewed: 'green',
};

function employeeDisplayName(req: ChangeRequest): string {
  if (req.employeeId) return req.employeeId.name;
  if (req.proposedData?.name) return String(req.proposedData.name);
  return '—';
}

function employeeDisplayCode(req: ChangeRequest): string {
  if (req.employeeId) return req.employeeId.empCode;
  return 'TBD';
}

export function EmployeeChangeRequests() {
  const user = useAuth((s) => s.user);
  const canApprove = user?.permissions.includes('approve.employee_change') ?? false;

  const [statusFilter, setStatusFilter] = useState<'Flagged' | 'Reviewed' | ''>('Flagged');
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
  const counts = data?.counts ?? { Flagged: 0, Reviewed: 0 };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{canApprove ? 'Employee Change Requests' : 'Change History'}</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {canApprove ? 'Compliance-initiated employee changes — review and correct if needed' : 'Your submitted employee changes and their outcomes'}
          </p>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="dash-stat-grid mb-6">
        {canApprove ? (
          (['Flagged', 'Reviewed'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setStatusFilter(statusFilter === s ? '' : s); setPage(1); }}
              className={`card p-4 text-left transition hover:shadow-md ${statusFilter === s ? 'ring-2 ring-primary' : ''}`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{s}</div>
              <div className="text-3xl font-bold mt-1">{counts[s]}</div>
            </button>
          ))
        ) : (
          <div className="card p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Total Changes</div>
            <div className="text-3xl font-bold mt-1">{data?.total ?? 0}</div>
          </div>
        )}
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
                    {req.initiatedBy?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-text-muted text-xs">
                    {req.initiatedAt ? fmtDate(req.initiatedAt.slice(0, 10)) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[req.status]}>
                      {canApprove ? req.status : 'Processed'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="btn-outline btn-sm"
                      onClick={() => setReviewRequest(req)}
                    >
                      {req.status === 'Flagged' ? 'Review' : 'View'}
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
  const [reviewNote, setReviewNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const toast = useToast((s) => s.push);

  const isFlagged = request.status === 'Flagged';
  const isCreate = request.changeType === 'create';
  const isUpdate = request.changeType === 'update';
  const isDelete = request.changeType === 'delete';
  const employeeIsDeleted = request.employeeId?.isDeleted ?? false;

  const submit = async (action: 'keep' | 'remove' | 'revert' | 'reinstate') => {
    setBusy(true);
    setFormError(null);
    try{
      await employeeChangeRequestsApi.review(request._id, {
        action,
        reviewNote: reviewNote.trim() || undefined,
        timeShift: isCreate ? timeShift: undefined,
      });
      const messages = {
        keep: 'Change kept',
        remove: 'Employee removed',
        revert: 'Change reverted',
        reinstate: 'Employee reinstated',
      };
      toast(messages[action],'success');
      onDecided();
    } catch(e: unknown){
      setFormError(e instanceof ApiError? e.message: 'Could not process review');
    } finally{
      setBusy(false);
    }
  }

  const proposed = request.proposedData ?? {};
  const previous = request.previousData ?? {};

  function DataRow({ label, prev, next }: { label: string; prev?: unknown; next?: unknown }) {
    const prevStr = prev != null ? String(prev) : '—';
    const nextStr = next != null ? String(next) : '—';
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
      title={`Review: ${request.changeType.charAt(0).toUpperCase() + request.changeType.slice(1)}`}
      size="xl"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose} disabled={busy}>Close</button>
          {isFlagged && canApprove && (
            <>
              {isCreate && (
                <>
                {!employeeIsDeleted && (
                  <button type="button" className="btn-outline text-red" disabled={busy} onClick={() => submit('remove')}>
                    {busy ? 'Processing…' : 'Remove employee'}
                  </button>
                )}
                <button type="button" className="btn-primary" disabled={busy} onClick={() => submit('keep')}>
                  {busy ? 'Processing…' : 'Keep employee'}
                </button>
            </>
          )}
          {isUpdate && (
            <>
              {!employeeIsDeleted && (
                  <button type="button" className="btn-outline text-red" disabled={busy} onClick={() => submit('revert')}>
                    {busy ? 'Processing…' : 'Revert changes'}
                  </button>
              )}
              <button type="button" className="btn-primary" disabled={busy} onClick={() => submit('keep')}>
                {busy ? 'Processing…' : 'Keep changes'}
              </button>
            </>
          )}
          {isDelete && (
            <>
              <button type="button" className="btn-outline" disabled={busy} onClick={() => submit('reinstate')}>
                {busy ? 'Processing…' : 'Reinstate employee'}
              </button>
              <button type="button" className="btn-primary bg-red hover:bg-red/90" disabled={busy} onClick={() => submit('keep')}>
                {busy ? 'Processing…' : 'Confirm deletion'}
              </button>
            </>
          )}
        </>
      )}
    </>
  }
    >
      <div className="space-y-5 text-sm">
        <div className="flex flex-wrap gap-4 text-xs text-text-muted">
          <span><span className="font-semibold text-text">Employee:</span> {employeeDisplayName(request)} ({employeeDisplayCode(request)})</span>
          <span><span className="font-semibold text-text">Submitted by:</span> {request.initiatedBy?.name}</span>
          <span><span className="font-semibold text-text">Date:</span> {request.initiatedAt ? fmtDate(request.initiatedAt.slice(0, 10)) : '—'}</span>
        </div>

        <div className="rounded-md border border-border bg-surface2/40 px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Reason</div>
          <p className="text-sm">{request.reason}</p>
        </div>

        {isCreate && employeeIsDeleted && (
          <div className="rounded-md border border-amber/30 bg-amber-bg px-4 py-3 text-sm text-amber">
            This employee has been deleted. You can only acknowledge this record — handle the Delete record first.
          </div>
        )}

        {isUpdate && employeeIsDeleted && (
          <div className="rounded-md border border-amber/30 bg-amber-bg px-4 py-3 text-sm text-amber">
            This employee has been deleted. You cannot revert this update — handle the Delete record first.
          </div>
        )}

        {isDelete && (
          <div className="rounded-md border border-red/30 bg-red-bg px-4 py-3 text-sm text-red">
            <strong>{employeeDisplayName(request)}</strong> has already been removed from the system. Confirm deletion or reinstate if it was a mistake.
          </div>
        )}

        {!isDelete && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">
              {isUpdate ? 'Proposed changes (highlighted = changed)' : 'New employee data'}
            </div>
            <div className="border border-border rounded overflow-auto max-h-64">
              <table className="w-full">
                <thead className="bg-surface2 sticky top-0">
                  <tr className="text-left text-[10px] uppercase tracking-wider text-text-muted">
                    <th className="px-3 py-2 w-32">Field</th>
                    {isUpdate ? (
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
                    <DataRow key={f.key} label={f.label} prev={previous[f.key]} next={proposed[f.key]} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {isFlagged && canApprove && isCreate && (
          <div className="rounded-md border border-primary/30 bg-primary-bg px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">
              Verify real time shift (HR only — not visible to compliance)
            </div>
            <p className="text-xs text-text-muted mb-3">
              Auto-assigned from compliance shift (A/B → Day, C → Night). Correct if this employee is cross-mapped.
            </p>
            <SelectField id="review-shift" label="Time shift" value={timeShift} onChange={(v) => setTimeShift(v as 'Day' | 'Night')}>
              <option value="Day">Day (6 AM – 6 PM)</option>
              <option value="Night">Night (6 PM – 6 AM)</option>
            </SelectField>
          </div>
        )}

        {isFlagged && canApprove && (
          <div>
            <label className="label">Review note (optional)</label>
            <textarea
              className="input w-full min-h-[60px] resize-y"
              placeholder="Add a note about this change…"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
            />
          </div>
        )}

        {!isFlagged && (
          <div className="rounded-md border border-border bg-surface2/40 px-4 py-3 text-xs text-text-muted space-y-1">
            <div><span className="font-semibold">Status:</span> <Badge tone={STATUS_TONE[request.status]}>{request.status}</Badge></div>
            {request.reviewedBy && <div><span className="font-semibold">Reviewed by:</span> {request.reviewedBy.name ?? '—'}</div>}
            {request.reviewedAt && <div><span className="font-semibold">Reviewed on:</span> {fmtDate(request.reviewedAt.slice(0, 10))}</div>}
            {request.reviewNote && <div><span className="font-semibold">Note:</span> {request.reviewNote}</div>}
          </div>
        )}

        {formError && (
          <div className="text-sm text-red bg-red-bg px-3 py-2 rounded">{formError}</div>
        )}
      </div>
    </Modal>
  );
}