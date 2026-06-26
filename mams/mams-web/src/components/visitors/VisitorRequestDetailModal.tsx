import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { VisitorField, VisitorVisitAccess } from '@mams/types';
import { defaultVisitValidUntil, resolveVisitValidUntil } from '@mams/types';
import { visitorsApi } from '../../api/visitors';
import { useAuth } from '../../store/auth';
import { useTimeDisplay } from '../../store/timeFormat';
import { useToast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { Field, Input, Textarea } from '../ui/Field';
import { TimeInput } from '../ui/TimeInput';
import { Badge } from '../ui/Badge';
import { fmtDate } from '../../lib/format';
import { AUDIT_EVENT_LABELS, formatVisitorResponse, visitorStatusTone } from './visitorsUtils';

type VisitAccessMode = VisitorVisitAccess['mode'];

function istTodayYmd(): string {
  const istMs = Date.now() + 5.5 * 60 * 60 * 1000;
  const x = new Date(istMs);
  const y = x.getUTCFullYear();
  const m = String(x.getUTCMonth() + 1).padStart(2, '0');
  const d = String(x.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildVisitAccess(
  mode: VisitAccessMode,
  durationHours: number,
  untilDate: string,
  untilTime: string
): VisitorVisitAccess {
  if (mode === 'duration') return { mode: 'duration', durationHours };
  if (mode === 'until') return { mode: 'until', validUntilDate: untilDate, validUntilTime: untilTime };
  return { mode: 'default' };
}

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
  const [visitMode, setVisitMode] = useState<VisitAccessMode>('default');
  const [durationHours, setDurationHours] = useState(2);
  const [untilDate, setUntilDate] = useState(istTodayYmd);
  const [untilTime, setUntilTime] = useState('18:00');
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const accessToken = useAuth((s) => s.accessToken);
  const { fmtDateTimeMs, inputHint } = useTimeDisplay();

  const { data, isLoading } = useQuery({
    queryKey: ['visitors', 'requests', requestId],
    queryFn: () => visitorsApi.getRequest(requestId),
  });

  const item = data?.item;
  const auditTrail = data?.auditTrail ?? [];
  const showActions = canApprove && item?.status === 'Pending';

  const previewValidUntil = useMemo(() => {
    if (!showActions) return null;
    const access = buildVisitAccess(visitMode, durationHours, untilDate, untilTime);
    return resolveVisitValidUntil(access, new Date()).visitValidUntil;
  }, [showActions, visitMode, durationHours, untilDate, untilTime]);

  const defaultUntilPreview = useMemo(() => defaultVisitValidUntil(new Date()), []);

  const approveMu = useMutation({
    mutationFn: () =>
      visitorsApi.approveRequest(requestId, {
        approverNote: approverNote || undefined,
        visitAccess: buildVisitAccess(visitMode, durationHours, untilDate, untilTime),
      }),
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
  const canApproveSubmit =
    visitMode !== 'until' || (untilDate.trim().length > 0 && untilTime.trim().length > 0);

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
              disabled={busy || !canApproveSubmit}
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

          {item.introAttestation?.videoCompleted && (
            <p className="text-sm text-text-muted">
              Intro video completed: Yes
              {item.introAttestation.completedAt
                ? ` (${fmtDate(item.introAttestation.completedAt)})`
                : ''}
            </p>
          )}

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
                      className="text-sm text-link hover:underline"
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
              {item.visitValidUntil ? (
                <p className="mt-1">Visit allowed until {fmtDateTimeMs(item.visitValidUntil)}</p>
              ) : item.status === 'Approved' ? (
                <p className="mt-1">Visit window not recorded</p>
              ) : null}
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
            <>
              <div className="card p-4 bg-surface2/30 space-y-3">
                <p className="text-sm font-semibold">Visit access</p>
                <p className="text-xs text-text-muted">
                  Choose how long this visitor may remain on site. Default is 6:00 PM IST (today or tomorrow if
                  already past).
                </p>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="visit-access-mode"
                    className="mt-1"
                    checked={visitMode === 'default'}
                    onChange={() => setVisitMode('default')}
                  />
                  <span className="text-sm">
                    <span className="font-medium">Default</span>
                    <span className="block text-xs text-text-muted mt-0.5">
                      Valid until {fmtDateTimeMs(defaultUntilPreview)}
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="visit-access-mode"
                    className="mt-1"
                    checked={visitMode === 'duration'}
                    onChange={() => setVisitMode('duration')}
                  />
                  <span className="text-sm flex-1 min-w-0">
                    <span className="font-medium">Allowed for</span>
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-24"
                        min={0.5}
                        max={72}
                        step={0.5}
                        value={durationHours}
                        disabled={visitMode !== 'duration'}
                        onChange={(e) => setDurationHours(Number(e.target.value) || 0.5)}
                      />
                      <span className="text-sm text-text-muted">hours from approval</span>
                    </div>
                  </span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="visit-access-mode"
                    className="mt-1"
                    checked={visitMode === 'until'}
                    onChange={() => setVisitMode('until')}
                  />
                  <span className="text-sm flex-1 min-w-0">
                    <span className="font-medium">Valid until specific time</span>
                    <div className="mt-2 flex flex-col sm:flex-row gap-2">
                      <Input
                        type="date"
                        className="sm:flex-1"
                        value={untilDate}
                        disabled={visitMode !== 'until'}
                        onChange={(e) => setUntilDate(e.target.value)}
                      />
                      <TimeInput
                        className="sm:flex-1"
                        value={untilTime}
                        disabled={visitMode !== 'until'}
                        onChange={setUntilTime}
                      />
                    </div>
                    <p className="text-xs text-text-muted mt-1">{inputHint}</p>
                  </span>
                </label>

                {previewValidUntil && (
                  <p className="text-xs text-text-muted border-t border-border pt-2">
                    Preview: visit allowed until {fmtDateTimeMs(previewValidUntil)}
                  </p>
                )}
              </div>

              <Field label="Approver note (required for rejection)">
                <Textarea value={approverNote} onChange={(e) => setApproverNote(e.target.value)} rows={3} />
              </Field>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
