import { useState, useMemo, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { adjustmentsApi, type AdjustmentListItem } from '../api/adjustments';
import { employeesApi } from '../api/employees';
import { useAuth } from '../store/auth';
import { useToast } from '../components/ui/Toast';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Field, Input, Select, Textarea } from '../components/ui/Field';
import { fmtDate } from '../lib/format';
import { useTimeDisplay } from '../store/timeFormat';
import { usePageTourController } from '../hooks/usePageTourController';
import { GiveMeATourButton } from '../components/onboarding/GiveMeATourButton';
import {
  ADJUSTMENTS_TOUR_ACTIONS,
  adjustmentsTourScript,
} from '../lib/onboarding/scripts/adjustmentsTourScript';
import type { TourPageApi } from '../lib/onboarding/tourTypes';

type StatusFilter = 'All' | 'Pending' | 'Approved' | 'Rejected';

export function Adjustments() {
  const auth = useAuth((s) => s.user);
  const canCreate = auth?.permissions.includes('write.adjust') ?? false;
  const canApprove = auth?.permissions.includes('approve.adjust') ?? false;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Pending');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<AdjustmentListItem | null>(null);
  const [bulkDecideOpen, setBulkDecideOpen] = useState<'approve' | 'reject' | null>(null);
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const pageApiRef = useRef<TourPageApi>({});

  const { data, isLoading } = useQuery({
    queryKey: ['adjustments', statusFilter],
    queryFn: () => adjustmentsApi.list({ status: statusFilter === 'All' ? undefined : statusFilter, pageSize: 200 }),
  });

  const items = data?.items ?? [];
  const counts = data?.counts ?? { Pending: 0, Approved: 0, Rejected: 0 };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllPending = () => {
    const pendingIds = items.filter((i) => i.status === 'Pending').map((i) => i._id);
    setSelected(new Set(pendingIds));
  };

  const clearSelection = () => setSelected(new Set());

  const tour = usePageTourController('adjustments', adjustmentsTourScript, {
    pageApiRef,
    actionMap: ADJUSTMENTS_TOUR_ACTIONS,
    ready: !isLoading,
    onBeforeStart: () => pageApiRef.current.closeCreateModal?.(),
  });

  pageApiRef.current = {
    openCreateModal: () => setCreateOpen(true),
    closeCreateModal: () => setCreateOpen(false),
  };

  const bulkMutation = useMutation({
    mutationFn: async ({ decision, note }: { decision: 'approve' | 'reject'; note?: string }) =>
      adjustmentsApi.bulkDecide([...selected], decision, note),
    onSuccess: (result, vars) => {
      toast(
        `${vars.decision === 'approve' ? 'Approved' : 'Rejected'} ${result.approved + result.rejected} record(s). Skipped ${result.skipped}.`,
        'success'
      );
      clearSelection();
      setBulkDecideOpen(null);
      qc.invalidateQueries({ queryKey: ['adjustments'] });
    },
    onError: (e: any) => toast(e?.message ?? 'Bulk decision failed', 'error'),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3" data-tour-id="adjustments-header">
        <div>
          <h1 className="text-2xl font-bold">Attendance Adjustments</h1>
          <div className="text-sm text-text-muted">HR-initiated corrections with mandatory justification and immutable audit trail.</div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <GiveMeATourButton onClick={tour.onReplayTour} />
        {canCreate && (
          <button
            className="btn-primary"
            data-tour-id="adjustments-create"
            onClick={() => {
              setCreateOpen(true);
              tour.tourRef.current?.onUserAction('create-opened');
            }}
          >
            + New Adjustment
          </button>
        )}
        </div>
      </div>

      <div className="dash-stat-grid mb-6" data-tour-id="adjustments-status-filters">
        <StatCard
          label="Pending"
          value={counts.Pending}
          accent="amber"
          selected={statusFilter === 'Pending'}
          onClick={() => setStatusFilter('Pending')}
        />
        <StatCard
          label="Approved"
          value={counts.Approved}
          accent="green"
          selected={statusFilter === 'Approved'}
          onClick={() => setStatusFilter('Approved')}
        />
        <StatCard
          label="Rejected"
          value={counts.Rejected}
          accent="red"
          selected={statusFilter === 'Rejected'}
          onClick={() => setStatusFilter('Rejected')}
        />
        <StatCard
          label="All"
          value={counts.Pending + counts.Approved + counts.Rejected}
          accent="primary"
          selected={statusFilter === 'All'}
          onClick={() => setStatusFilter('All')}
        />
      </div>

      {canApprove && statusFilter === 'Pending' && items.length > 0 && (
        <div className="card p-3 mb-4 flex items-center gap-3 flex-wrap" data-tour-id="adjustments-bulk-actions">
          <button className="btn-outline" onClick={selectAllPending}>
            Select all pending ({items.filter((i) => i.status === 'Pending').length})
          </button>
          <div className="text-sm text-text-muted">{selected.size} selected</div>
          <div className="flex-1" />
          {selected.size > 0 && (
            <>
              <button className="btn bg-green text-white px-4 py-2 rounded-md text-sm font-semibold" onClick={() => setBulkDecideOpen('approve')}>
                Approve selected
              </button>
              <button className="btn bg-red text-white px-4 py-2 rounded-md text-sm font-semibold" onClick={() => setBulkDecideOpen('reject')}>
                Reject selected
              </button>
              <button className="btn-outline" onClick={clearSelection}>Clear</button>
            </>
          )}
        </div>
      )}

      {isLoading && <div className="text-text-muted">Loading...</div>}
      {!isLoading && items.length === 0 && (
        <div className="card p-12 text-center text-text-muted">
          No {statusFilter.toLowerCase()} adjustments.
        </div>
      )}

      <div className="space-y-3" data-tour-id="adjustments-list">
        {items.map((item) => (
          <AdjustmentCard
            key={item._id}
            item={item}
            selected={selected.has(item._id)}
            onToggle={() => toggleSelect(item._id)}
            canSelect={canApprove && item.status === 'Pending'}
            onOpen={() => setDetailItem(item)}
          />
        ))}
      </div>

      {createOpen && <CreateAdjustmentModal onClose={() => setCreateOpen(false)} />}
      {detailItem && (
        <AdjustmentDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          canApprove={canApprove}
        />
      )}
      {bulkDecideOpen && (
        <BulkDecisionModal
          decision={bulkDecideOpen}
          count={selected.size}
          onClose={() => setBulkDecideOpen(null)}
          onConfirm={(note) => bulkMutation.mutate({ decision: bulkDecideOpen, note })}
          busy={bulkMutation.isPending}
        />
      )}
    </div>
  );
}

function AdjustmentCard({
  item, selected, onToggle, canSelect, onOpen,
}: {
  item: AdjustmentListItem;
  selected: boolean;
  onToggle: () => void;
  canSelect: boolean;
  onOpen: () => void;
}) {
  const emp = typeof item.employeeId === 'object' ? item.employeeId : null;
  const initiator = typeof item.initiatedBy === 'object' ? item.initiatedBy : null;
  const decider = typeof item.decidedBy === 'object' ? item.decidedBy : null;
  const statusTone = item.status === 'Approved' ? 'green' : item.status === 'Rejected' ? 'red' : 'amber';
  const { fmtTime } = useTimeDisplay();

  return (
    <div className={`card p-5 ${selected ? 'ring-2 ring-primary' : ''}`}>
      <div className="flex items-start gap-3">
        {canSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="mt-1 w-4 h-4 accent-primary cursor-pointer"
            aria-label={`Select ${emp?.name ?? 'adjustment'}`}
          />
        )}
        <div className="flex-1 cursor-pointer" onClick={onOpen}>
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="font-bold">{emp?.name ?? 'Unknown'}</span>
              <span className="text-xs font-mono text-text-muted">{emp?.empCode}</span>
              <span className="text-xs text-text-muted">·</span>
              <span className="text-xs text-text-muted">{fmtDate(item.date)}</span>
            </div>
            <Badge tone={statusTone}>{item.status}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-subtle">Field changed</div>
              <div className="font-mono">{item.fieldChanged}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-subtle">Previous → New</div>
              <div className="font-mono text-xs truncate">
                {String(item.previousValue ?? '—')} → {String(item.newValue ?? '—')}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-subtle">Reason</div>
              <div>{item.reason}</div>
            </div>
          </div>
          <div className="mt-3 text-xs text-text-muted">
            Initiated by <span className="font-semibold">{initiator?.name ?? '—'}</span> at {fmtTime(item.initiatedAt)}
            {decider && (
              <>
                {' · '}
                {item.status === 'Approved' ? 'Approved' : 'Rejected'} by{' '}
                <span className="font-semibold">{decider.name}</span> at {fmtTime(item.decidedAt!)}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateAdjustmentModal({ onClose }: { onClose: () => void }) {
  const [empSearch, setEmpSearch] = useState('');
  const [empId, setEmpId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [fieldChanged, setFieldChanged] = useState<'realEntryAt' | 'realExitAt' | 'breakMinutes' | 'dayType' | 'status'>('realEntryAt');
  const [previousValue, setPreviousValue] = useState('');
  const [newValue, setNewValue] = useState('');
  const [reason, setReason] = useState<'missed_punch' | 'wrong_device' | 'system_outage' | 'shift_swap' | 'other'>('missed_punch');
  const [justification, setJustification] = useState('');
  const [evidenceRef, setEvidenceRef] = useState('');
  const [salaryImpactNote, setSalaryImpactNote] = useState('');
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();

  const empsQ = useQuery({
    queryKey: ['employees', { search: empSearch }],
    queryFn: () => employeesApi.list({ search: empSearch, pageSize: 20 }),
    enabled: empSearch.length >= 2,
  });

  const mutation = useMutation({
    mutationFn: () =>
      adjustmentsApi.create({
        employeeId: empId,
        date,
        fieldChanged,
        previousValue,
        newValue,
        reason,
        justification,
        evidenceRef,
        salaryImpactNote,
      }),
    onSuccess: () => {
      toast('Adjustment submitted for approval', 'success');
      qc.invalidateQueries({ queryKey: ['adjustments'] });
      onClose();
    },
    onError: (e: any) => toast(e?.message ?? 'Failed to submit', 'error'),
  });

  const valid = empId && date && fieldChanged && justification.length >= 10 && evidenceRef && salaryImpactNote;

  return (
    <Modal
      open
      onClose={onClose}
      title="New Adjustment"
      size="lg"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            disabled={!valid || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Submitting...' : 'Submit for approval'}
          </button>
        </>
      }
    >
      <div data-tour-id="adjustments-create-modal" className="space-y-4">
        <Field label="Employee" required>
          <Input
            placeholder="Search by name or code (min 2 chars)"
            value={empSearch}
            onChange={(e) => setEmpSearch(e.target.value)}
          />
          {empsQ.data && empsQ.data.items.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto border border-border rounded-md">
              {empsQ.data.items.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    setEmpId(e.id);
                    setEmpSearch(`${e.name} (${e.empCode})`);
                  }}
                  className={`block w-full text-left px-3 py-2 text-sm hover:bg-surface2 ${
                    empId === e.id ? 'bg-primary-bg' : ''
                  }`}
                >
                  <span className="font-medium">{e.name}</span>
                  <span className="ml-2 text-xs font-mono text-text-muted">{e.empCode}</span>
                </button>
              ))}
            </div>
          )}
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Date" required>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Field to correct" required>
            <Select value={fieldChanged} onChange={(e) => setFieldChanged(e.target.value as any)}>
              <option value="realEntryAt">Real entry time</option>
              <option value="realExitAt">Real exit time</option>
              <option value="breakMinutes">Break minutes</option>
              <option value="dayType">Day type</option>
              <option value="status">Status</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Previous value" hint="What was recorded">
            <Input value={previousValue} onChange={(e) => setPreviousValue(e.target.value)} />
          </Field>
          <Field label="New value" required hint="What it should be">
            <Input value={newValue} onChange={(e) => setNewValue(e.target.value)} />
          </Field>
        </div>

        <Field label="Reason" required>
          <Select value={reason} onChange={(e) => setReason(e.target.value as any)}>
            <option value="missed_punch">Missed punch</option>
            <option value="wrong_device">Wrong device</option>
            <option value="system_outage">System outage</option>
            <option value="shift_swap">Shift swap</option>
            <option value="other">Other</option>
          </Select>
        </Field>

        <Field
          label="Justification"
          required
          hint="Minimum 10 characters. Will be permanently logged."
          error={justification.length > 0 && justification.length < 10 ? 'At least 10 characters required' : undefined}
        >
          <Textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Why is this correction needed?"
          />
        </Field>

        <Field label="Supporting evidence (file URL or reference)" required>
          <Input
            value={evidenceRef}
            onChange={(e) => setEvidenceRef(e.target.value)}
            placeholder="e.g., email ref, file path, ticket #..."
          />
        </Field>

        <Field label="Salary impact note" required>
          <Input
            value={salaryImpactNote}
            onChange={(e) => setSalaryImpactNote(e.target.value)}
            placeholder="e.g., +0.5 day; OT +2 hours; none"
          />
        </Field>
      </div>
    </Modal>
  );
}

function AdjustmentDetailModal({
  item, onClose, canApprove,
}: {
  item: AdjustmentListItem;
  onClose: () => void;
  canApprove: boolean;
}) {
  const [approverNote, setApproverNote] = useState('');
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const emp = typeof item.employeeId === 'object' ? item.employeeId : null;
  const initiator = typeof item.initiatedBy === 'object' ? item.initiatedBy : null;
  const decider = typeof item.decidedBy === 'object' ? item.decidedBy : null;

  const decideMutation = useMutation({
    mutationFn: (decision: 'approve' | 'reject') => adjustmentsApi.decide(item._id, { decision, approverNote }),
    onSuccess: (_, decision) => {
      toast(`${decision === 'approve' ? 'Approved' : 'Rejected'}`, 'success');
      qc.invalidateQueries({ queryKey: ['adjustments'] });
      onClose();
    },
    onError: (e: any) => toast(e?.message ?? 'Decision failed', 'error'),
  });

  const { fmtTime } = useTimeDisplay();
  const showActions = canApprove && item.status === 'Pending';

  return (
    <Modal
      open
      onClose={onClose}
      title={`Adjustment for ${emp?.name ?? 'Unknown'}`}
      size="lg"
      footer={
        showActions ? (
          <>
            <button className="btn-outline" onClick={onClose}>Cancel</button>
            <button
              className="btn bg-red text-white px-4 py-2 rounded-md text-sm font-semibold"
              disabled={decideMutation.isPending}
              onClick={() => decideMutation.mutate('reject')}
            >
              Reject
            </button>
            <button
              className="btn bg-green text-white px-4 py-2 rounded-md text-sm font-semibold"
              disabled={decideMutation.isPending}
              onClick={() => decideMutation.mutate('approve')}
            >
              Approve
            </button>
          </>
        ) : (
          <button className="btn-outline" onClick={onClose}>Close</button>
        )
      }
    >
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DetailRow label="Employee" value={`${emp?.name ?? '—'} (${emp?.empCode ?? '—'})`} />
          <DetailRow label="Department" value={emp?.department ?? '—'} />
          <DetailRow label="Location" value={emp?.location ?? '—'} />
          <DetailRow label="Date" value={fmtDate(item.date)} />
          <DetailRow label="Field changed" value={item.fieldChanged} mono />
          <DetailRow label="Reason" value={item.reason} />
          <DetailRow label="Previous value" value={String(item.previousValue ?? '—')} mono />
          <DetailRow label="New value" value={String(item.newValue ?? '—')} mono />
        </div>
        <DetailRow label="Justification" value={item.justification} block />
        <DetailRow label="Supporting evidence" value={item.evidenceRef} block />
        <DetailRow label="Salary impact" value={item.salaryImpactNote} block />

        <div className="pt-3 border-t border-border">
          <div className="text-[10px] uppercase tracking-wider text-text-subtle mb-1">Audit trail</div>
          <div className="text-xs text-text-muted">
            Initiated by <span className="font-semibold">{initiator?.name ?? '—'}</span> ({initiator?.email ?? '—'}) at {fmtTime(item.initiatedAt)}
          </div>
          {decider && (
            <div className="text-xs text-text-muted">
              {item.status === 'Approved' ? 'Approved' : 'Rejected'} by{' '}
              <span className="font-semibold">{decider.name}</span> ({decider.email}) at {fmtTime(item.decidedAt!)}
              {item.approverNote && (
                <div className="mt-1 italic">Note: {item.approverNote}</div>
              )}
            </div>
          )}
        </div>

        {showActions && (
          <Field label="Approver note (optional)">
            <Textarea
              value={approverNote}
              onChange={(e) => setApproverNote(e.target.value)}
              placeholder="Optional note shown in the audit log"
            />
          </Field>
        )}
      </div>
    </Modal>
  );
}

function BulkDecisionModal({
  decision, count, onClose, onConfirm, busy,
}: {
  decision: 'approve' | 'reject';
  count: number;
  onClose: () => void;
  onConfirm: (note?: string) => void;
  busy: boolean;
}) {
  const [note, setNote] = useState('');
  return (
    <Modal
      open
      onClose={onClose}
      title={`${decision === 'approve' ? 'Approve' : 'Reject'} ${count} adjustment${count === 1 ? '' : 's'}`}
      size="md"
      footer={
        <>
          <button className="btn-outline" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            className={`btn ${decision === 'approve' ? 'bg-green' : 'bg-red'} text-white px-4 py-2 rounded-md text-sm font-semibold`}
            onClick={() => onConfirm(note || undefined)}
            disabled={busy}
          >
            {busy ? 'Processing...' : `Confirm ${decision}`}
          </button>
        </>
      }
    >
      <p className="text-sm mb-4">
        You are about to <span className="font-semibold">{decision}</span> {count} pending adjustment
        {count === 1 ? '' : 's'}. This is permanent and will be audit-logged.
      </p>
      <Field label="Optional note (applied to all)">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </Modal>
  );
}

function DetailRow({ label, value, mono, block }: { label: string; value: string; mono?: boolean; block?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-text-subtle">{label}</div>
      <div className={`${mono ? 'font-mono' : ''} ${block ? '' : 'truncate'}`}>{value}</div>
    </div>
  );
}
