import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { VisitorField } from '@mams/types';
import { visitorsApi, type VisitorRequestListItem } from '../../api/visitors';
import { useAuth } from '../../store/auth';
import { useToast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { Field, Textarea } from '../ui/Field';
import { Badge } from '../ui/Badge';
import { fmtDate } from '../../lib/format';
import { AUDIT_EVENT_LABELS, formatVisitorResponse, visitorStatusTone } from './visitorsUtils';

export function VisitorRequestDetailModal({
  requestId,
  onClose,
  canApprove,
}: {
  requestId: string;
  onClose: () => void;
  canApprove: boolean;
}) {
  const [approverNote, setApproverNote] = useState('');
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const accessToken = useAuth((s) => s.accessToken);

  const { data, isLoading } = useQuery({
    queryKey: ['visitors', 'requests', requestId],
    queryFn: () => visitorsApi.getRequest(requestId),
  });

  const item = data?.item;
  const auditTrail = data?.auditTrail ?? [];
  const showActions = canApprove && item?.status === 'Pending';

  const approveMu = useMutation({
    mutationFn: () => visitorsApi.approveRequest(requestId, { approverNote: approverNote || undefined }),
    onSuccess: () => {
      toast('Visitor request approved', 'success');
      qc.invalidateQueries({ queryKey: ['visitors'] });
      onClose();
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const rejectMu = useMutation({
    mutationFn: () => visitorsApi.rejectRequest(requestId, { approverNote }),
    onSuccess: () => {
      toast('Visitor request rejected', 'success');
      qc.invalidateQueries({ queryKey: ['visitors'] });
      onClose();
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const busy = approveMu.isPending || rejectMu.isPending;
  const canReject = approverNote.trim().length > 0;

  const fields = (item?.fieldsSnapshot ?? []) as VisitorField[];
  const sortedFields = [...fields].sort((a, b) => a.order - b.order);

  const decider = item && typeof item.decidedBy === 'object' ? item.decidedBy : null;

  return (
    <Modal
      open
      onClose={onClose}
      title={item ? `Visitor request — ${item.formTitle}` : 'Visitor request'}
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
              onClick={() => rejectMu.mutate()}
            >
              Reject
            </button>
            <button
              className="btn bg-green text-white px-4 py-2 rounded-md text-sm font-semibold"
              disabled={busy}
              onClick={() => approveMu.mutate()}
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
      {isLoading && <p className="text-text-muted text-sm">Loading…</p>}
      {item && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={visitorStatusTone(item.status)}>{item.status}</Badge>
            <span className="text-sm text-text-muted">Submitted {fmtDate(item.submittedAt)}</span>
            <span className="text-xs text-text-muted">Form v{item.formVersion}</span>
          </div>

          <div className="card p-4 bg-surface2/40 space-y-3">
            <p className="text-sm font-semibold">Submitted information</p>
            {sortedFields.map((field) => {
              const fileAtt = item.fileAttachments.find((a) => a.fieldId === field.id);
              const value = item.responses[field.id];
              return (
                <div key={field.id}>
                  <p className="text-xs font-medium text-text-muted">{field.label}</p>
                  {fileAtt ? (
                    <a
                      href={visitorsApi.fileUrl(fileAtt.storageKey)}
                      className="text-sm text-primary hover:underline"
                      download={fileAtt.filename}
                      onClick={(e) => {
                        if (accessToken) {
                          e.preventDefault();
                          fetch(visitorsApi.fileUrl(fileAtt.storageKey), {
                            headers: { Authorization: `Bearer ${accessToken}` },
                          })
                            .then((r) => r.blob())
                            .then((blob) => {
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = fileAtt.filename;
                              a.click();
                              URL.revokeObjectURL(url);
                            })
                            .catch(() => toast('Download failed', 'error'));
                        }
                      }}
                    >
                      {fileAtt.filename} ({Math.round(fileAtt.size / 1024)} KB)
                    </a>
                  ) : (
                    <p className="text-sm">{formatVisitorResponse(value)}</p>
                  )}
                </div>
              );
            })}
          </div>

          {item.status !== 'Pending' && decider && (
            <div className="text-sm text-text-muted">
              <p>
                {item.status} by {decider.name} on {item.decidedAt ? fmtDate(item.decidedAt) : '—'}
              </p>
              {item.approverNote && <p className="mt-1">Note: {item.approverNote}</p>}
            </div>
          )}

          {auditTrail.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2">Approval history</p>
              <ul className="space-y-2 text-sm">
                {auditTrail.map((entry) => {
                  const actor = typeof entry.userId === 'object' ? entry.userId?.name : null;
                  return (
                    <li key={entry._id} className="flex gap-2 text-text-muted">
                      <span className="shrink-0">{fmtDate(entry.occurredAt)}</span>
                      <span>
                        {AUDIT_EVENT_LABELS[entry.eventType] ?? entry.eventType}
                        {actor ? ` — ${actor}` : entry.eventType === 'visitor_request_submitted' ? ' — Visitor' : ''}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {showActions && (
            <Field label="Approver note (required for rejection)">
              <Textarea value={approverNote} onChange={(e) => setApproverNote(e.target.value)} rows={3} />
            </Field>
          )}
        </div>
      )}
    </Modal>
  );
}
