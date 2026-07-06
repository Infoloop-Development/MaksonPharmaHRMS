import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ComplianceShift } from '@mams/types';
import {
  complianceAttendanceApi,
  type ComplianceAttendanceRow,
} from '../../api/complianceAttendance';
import { Modal } from '../ui/Modal';
import { Field, Input, Select, Textarea } from '../ui/Field';
import { useToast } from '../ui/Toast';
import { fmtDate } from '../../lib/format';

function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ComplianceOverrideModal({
  row,
  onClose,
}: {
  row: ComplianceAttendanceRow;
  onClose: () => void;
}) {
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const [checkInAt, setCheckInAt] = useState(isoToDatetimeLocal(row.checkInAt));
  const [checkOutAt, setCheckOutAt] = useState(isoToDatetimeLocal(row.checkOutAt));
  const [hoursWorked, setHoursWorked] = useState(String(row.hoursWorked));
  const [alternateShift, setAlternateShift] = useState<ComplianceShift>(row.alternateShift);
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const skipAutoHours = useRef(true);

  // Keep hours worked in sync with clock-in/out so a saved record can't have
  // contradictory times and hours; HR can still fine-tune the hours afterward.
  useEffect(() => {
    if (skipAutoHours.current) {
      skipAutoHours.current = false;
      return;
    }
    const inDate = new Date(checkInAt);
    const outDate = new Date(checkOutAt);
    if (Number.isNaN(inDate.getTime()) || Number.isNaN(outDate.getTime()) || outDate <= inDate) return;
    const hours = (outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60);
    setHoursWorked(hours.toFixed(2));
  }, [checkInAt, checkOutAt]);

  const saveMutation = useMutation({
    mutationFn: () =>
      complianceAttendanceApi.update(row._id, {
        checkInAt: new Date(checkInAt).toISOString(),
        checkOutAt: new Date(checkOutAt).toISOString(),
        hoursWorked: Number(hoursWorked),
        alternateShift,
        adjustmentNote: adjustmentNote.trim(),
      }),
    onSuccess: () => {
      toast('Compliance record updated', 'success');
      qc.invalidateQueries({ queryKey: ['compliance-attendance'] });
      onClose();
    },
    onError: (e) => {
      toast(e instanceof Error ? e.message : 'Update failed', 'error');
    },
  });

  const onSubmit = () => {
    if (adjustmentNote.trim().length < 5) {
      toast('Adjustment note must be at least 5 characters', 'error');
      return;
    }
    const hours = Number(hoursWorked);
    if (!Number.isFinite(hours) || hours < 0) {
      toast('Enter valid hours worked', 'error');
      return;
    }
    saveMutation.mutate();
  };

  const employeeName = row.employeeId?.name ?? 'Employee';

  return (
    <Modal
      open
      title="Override compliance record"
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={saveMutation.isPending}
            onClick={onSubmit}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save override'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          {employeeName}
          {row.employeeId?.empCode ? ` (${row.employeeId.empCode})` : ''} · {fmtDate(row.date)}
        </p>

        <Field label="Clock-in" required>
          <Input type="datetime-local" value={checkInAt} onChange={(e) => setCheckInAt(e.target.value)} />
        </Field>

        <Field label="Clock-out" required>
          <Input type="datetime-local" value={checkOutAt} onChange={(e) => setCheckOutAt(e.target.value)} />
        </Field>

        <Field label="Hours worked" required hint="Auto-fills from clock-in/out; adjust manually only for unpaid breaks">
          <Input
            type="number"
            min={0}
            step={0.01}
            value={hoursWorked}
            onChange={(e) => setHoursWorked(e.target.value)}
          />
        </Field>

        <Field label="Shift" required>
          <Select value={alternateShift} onChange={(e) => setAlternateShift(e.target.value as ComplianceShift)}>
            <option value="A">Morning (A)</option>
            <option value="B">Afternoon (B)</option>
            <option value="C">Night (C)</option>
          </Select>
        </Field>

        <Field label="Adjustment note" required hint="Min 5 characters — recorded in audit log">
          <Textarea
            rows={3}
            value={adjustmentNote}
            onChange={(e) => setAdjustmentNote(e.target.value)}
            placeholder="Reason for override…"
          />
        </Field>
      </div>
    </Modal>
  );
}
