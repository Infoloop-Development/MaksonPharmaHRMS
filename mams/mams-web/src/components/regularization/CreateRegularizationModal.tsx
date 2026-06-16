import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '../../api/employees';
import { regularizationApi } from '../../api/regularization';
import { useToast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { Field, Input, Select, Textarea } from '../ui/Field';
import { TimeInput } from '../ui/TimeInput';
import { useTimeDisplay } from '../../store/timeFormat';
import type { RegularizationType } from '@mams/types';
import {
  regularizationTypeNeedsIn,
  regularizationTypeNeedsOut,
  REGULARIZATION_TYPE_LABELS,
} from './regularizationUtils';

export function CreateRegularizationModal({ onClose }: { onClose: () => void }) {
  const [empSearch, setEmpSearch] = useState('');
  const [empId, setEmpId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<RegularizationType>('missed_in');
  const [requestedInTime, setRequestedInTime] = useState('');
  const [requestedOutTime, setRequestedOutTime] = useState('');
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const { fmtTime, inputHint } = useTimeDisplay();

  const empsQ = useQuery({
    queryKey: ['employees', { search: empSearch }],
    queryFn: () => employeesApi.list({ search: empSearch, pageSize: 20 }),
    enabled: empSearch.length >= 2,
  });

  const previewQ = useQuery({
    queryKey: ['regularization-preview', empId, date],
    queryFn: () => regularizationApi.preview(empId, date),
    enabled: Boolean(empId && date),
  });

  const mutation = useMutation({
    mutationFn: () =>
      regularizationApi.create({
        employeeId: empId,
        date,
        type,
        requestedInTime: regularizationTypeNeedsIn(type) ? requestedInTime : undefined,
        requestedOutTime: regularizationTypeNeedsOut(type) ? requestedOutTime : undefined,
        reason,
        remarks: remarks || undefined,
      }),
    onSuccess: () => {
      toast('Regularization request submitted for approval', 'success');
      qc.invalidateQueries({ queryKey: ['regularization'] });
      onClose();
    },
    onError: (e: any) => toast(e?.message ?? 'Failed to submit', 'error'),
  });

  const needsIn = regularizationTypeNeedsIn(type);
  const needsOut = regularizationTypeNeedsOut(type);
  const valid =
    empId &&
    date &&
    reason.length >= 10 &&
    (!needsIn || requestedInTime) &&
    (!needsOut || requestedOutTime);

  return (
    <Modal
      open
      onClose={onClose}
      title="New regularization request"
      size="lg"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Submitting...' : 'Submit for approval'}
          </button>
        </>
      }
    >
      <div className="space-y-4" data-tour-id="regularization-create-modal">
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
          <Field label="Regularization type" required>
            <Select value={type} onChange={(e) => setType(e.target.value as RegularizationType)}>
              {(Object.keys(REGULARIZATION_TYPE_LABELS) as RegularizationType[]).map((t) => (
                <option key={t} value={t}>
                  {REGULARIZATION_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {(needsIn || needsOut) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {needsIn && (
              <Field label="Requested IN time (IST)" required hint={inputHint}>
                <TimeInput value={requestedInTime} onChange={setRequestedInTime} />
              </Field>
            )}
            {needsOut && (
              <Field label="Requested OUT time (IST)" required hint={inputHint}>
                <TimeInput value={requestedOutTime} onChange={setRequestedOutTime} />
              </Field>
            )}
          </div>
        )}

        {empId && date && (
          <div className="rounded-md border border-border bg-surface2 p-4 text-sm">
            <div className="text-[10px] uppercase tracking-wider text-text-subtle mb-2">Attendance preview</div>
            {previewQ.isLoading && <div className="text-text-muted">Loading preview...</div>}
            {previewQ.isError && <div className="text-red">Could not load attendance preview</div>}
            {previewQ.data && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-text-muted">Status</div>
                  <div className="font-semibold">{previewQ.data.derived?.status ?? 'No record'}</div>
                </div>
                <div>
                  <div className="text-xs text-text-muted">Current IN / OUT</div>
                  <div className="font-mono text-xs">
                    {previewQ.data.derived?.realEntryAt ? fmtTime(previewQ.data.derived.realEntryAt) : '—'} /{' '}
                    {previewQ.data.derived?.realExitAt ? fmtTime(previewQ.data.derived.realExitAt) : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-muted">Raw punches</div>
                  <div>{previewQ.data.rawPunchCount}</div>
                </div>
              </div>
            )}
          </div>
        )}

        <Field
          label="Reason"
          required
          hint="Minimum 10 characters. Will be permanently logged."
          error={reason.length > 0 && reason.length < 10 ? 'At least 10 characters required' : undefined}
        >
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this correction needed?" />
        </Field>

        <Field label="Remarks (optional)">
          <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Additional context..." />
        </Field>
      </div>
    </Modal>
  );
}
