import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { LeaveTypePatch } from '@mams/types';
import { leaveApi, type LeaveTypeItem } from '../../api/leave';
import { useToast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { Field, Input } from '../ui/Field';

export function LeaveTypeFormModal({
  mode,
  initial,
  onClose,
  onSuccess,
}: {
  mode: 'create' | 'edit';
  initial?: LeaveTypeItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast((s) => s.push);
  const [code, setCode] = useState(initial?.code ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [paid, setPaid] = useState(initial?.paid ?? true);
  const [halfDayEligible, setHalfDayEligible] = useState(initial?.halfDayEligible ?? true);
  const [annualQuotaDefault, setAnnualQuotaDefault] = useState(String(initial?.annualQuotaDefault ?? 0));
  const [requiresDocument, setRequiresDocument] = useState(initial?.requiresDocument ?? false);
  const [active, setActive] = useState(initial?.active ?? true);

  const saveMu = useMutation({
    mutationFn: async () => {
      if (mode === 'create') {
        return leaveApi.createType({
          code: code.trim(),
          name: name.trim(),
          paid,
          halfDayEligible,
          annualQuotaDefault: Number(annualQuotaDefault),
          requiresDocument,
          active,
          sortOrder: 0,
        });
      }
      const patch: LeaveTypePatch = {
        name: name.trim(),
        paid,
        halfDayEligible,
        annualQuotaDefault: Number(annualQuotaDefault),
        requiresDocument,
        active,
      };
      return leaveApi.patchType(initial!.id, patch);
    },
    onSuccess: () => {
      toast(mode === 'create' ? 'Leave type created' : 'Leave type updated', 'success');
      onSuccess();
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const valid = name.trim() && (mode === 'edit' || /^[a-z0-9_]+$/.test(code.trim()));

  return (
    <Modal
      open
      title={mode === 'create' ? 'Add leave type' : 'Edit leave type'}
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" disabled={!valid || saveMu.isPending} onClick={() => saveMu.mutate()}>
            {saveMu.isPending ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      {mode === 'create' && (
        <Field label="Code (lowercase, underscores)" required>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. casual_leave" />
        </Field>
      )}
      <Field label="Name" required>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Default annual quota">
        <Input type="number" min={0} value={annualQuotaDefault} onChange={(e) => setAnnualQuotaDefault(e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-4 mt-3 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} /> Paid</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={halfDayEligible} onChange={(e) => setHalfDayEligible(e.target.checked)} /> Half-day eligible</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={requiresDocument} onChange={(e) => setRequiresDocument(e.target.checked)} /> Requires document</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active</label>
      </div>
    </Modal>
  );
}
