import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { regularizationApi, type RegularizationListItem } from '../../api/regularization';
import { useToast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { Field, Textarea } from '../ui/Field';
import { Badge } from '../ui/Badge';
import { fmtDate, fmtIstTime } from '../../lib/format';
import {
  formatRequestedTimes,
  REGULARIZATION_TYPE_LABELS,
  statusTone,
} from './regularizationUtils';

export function RegularizationDetailModal({
  item,
  onClose,
  canApprove,
}: {
  item: RegularizationListItem;
  onClose: () => void;
  canApprove: boolean;
}) {
  const [approverNote, setApproverNote] = useState('');
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const emp = typeof item.employeeId === 'object' ? item.employeeId : null;
  const initiator = typeof item.initiatedBy === 'object' ? item.initiatedBy : null;
  const decider = typeof item.decidedBy === 'object' ? item.decidedBy : null;
  const showActions = canApprove && item.status === 'Pending';

  const approveMutation = useMutation({
    mutationFn: () => regularizationApi.approve(item._id, { approverNote: approverNote || undefined }),
    onSuccess: () => {
      toast('Regularization approved — raw punches inserted', 'success');
      qc.invalidateQueries({ queryKey: ['regularization'] });
      onClose();
    },
    onError: (e: any) => toast(e?.message ?? 'Approval failed', 'error'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => regularizationApi.reject(item._id, { approverNote }),
    onSuccess: () => {
      toast('Regularization rejected', 'success');
      qc.invalidateQueries({ queryKey: ['regularization'] });
      onClose();
    },
    onError: (e: any) => toast(e?.message ?? 'Rejection failed', 'error'),
  });

  const busy = approveMutation.isPending || rejectMutation.isPending;
  const canReject = approverNote.trim().length > 0;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Regularization for ${emp?.name ?? 'Unknown'}`}
      size="lg"
      footer={
        showActions ? (
          <>
            <button className="btn-outline" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button
              className="btn bg-red text-white px-4 py-2 rounded-md text-sm font-semibold"
              disabled={busy || !canReject}
              onClick={() => rejectMutation.mutate()}
            >
              Reject
            </button>
            <button
              className="btn bg-green text-white px-4 py-2 rounded-md text-sm font-semibold"
              disabled={busy}
              onClick={() => approveMutation.mutate()}
            >
              Approve
            </button>
          </>
        ) : (
          <button className="btn-outline" onClick={onClose}>
            Close
          </button>
        )
      }
    >
      <div className="space-y-4 text-sm">
        <div className="flex items-center gap-2 mb-2">
          <Badge tone={statusTone(item.status)}>{item.status}</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DetailRow label="Employee" value={`${emp?.name ?? '—'} (${emp?.empCode ?? '—'})`} />
          <DetailRow label="Department" value={emp?.department ?? '—'} />
          <DetailRow label="Location" value={emp?.location ?? '—'} />
          <DetailRow label="Date" value={fmtDate(item.date)} />
          <DetailRow label="Type" value={REGULARIZATION_TYPE_LABELS[item.type]} />
          <DetailRow
            label="Requested times"
            value={formatRequestedTimes(item.type, item.requestedInTime, item.requestedOutTime)}
            mono
          />
        </div>
        <DetailRow label="Reason" value={item.reason} block />
        {item.remarks && <DetailRow label="Remarks" value={item.remarks} block />}

        {item.status === 'Approved' && item.appliedRawIds.length > 0 && (
          <DetailRow label="Applied raw punch IDs" value={item.appliedRawIds.join(', ')} mono block />
        )}

        <div className="pt-3 border-t border-border">
          <div className="text-[10px] uppercase tracking-wider text-text-subtle mb-1">Audit trail</div>
          <div className="text-xs text-text-muted">
            Initiated by <span className="font-semibold">{initiator?.name ?? '—'}</span> ({initiator?.email ?? '—'}) at{' '}
            {fmtIstTime(item.initiatedAt)}
          </div>
          {decider && (
            <div className="text-xs text-text-muted">
              {item.status === 'Approved' ? 'Approved' : 'Rejected'} by{' '}
              <span className="font-semibold">{decider.name}</span> ({decider.email}) at {fmtIstTime(item.decidedAt!)}
              {item.approverNote && <div className="mt-1 italic">Note: {item.approverNote}</div>}
            </div>
          )}
        </div>

        {showActions && (
          <>
            <Field label="Approver note (required for reject, optional for approve)">
              <Textarea
                value={approverNote}
                onChange={(e) => setApproverNote(e.target.value)}
                placeholder="Explain your decision..."
              />
            </Field>
            {!canReject && (
              <p className="text-xs text-text-muted">A note is required when rejecting a request.</p>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

function DetailRow({
  label,
  value,
  mono,
  block,
}: {
  label: string;
  value: string;
  mono?: boolean;
  block?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-text-subtle">{label}</div>
      <div className={`${mono ? 'font-mono' : ''} ${block ? '' : 'truncate'}`}>{value}</div>
    </div>
  );
}
