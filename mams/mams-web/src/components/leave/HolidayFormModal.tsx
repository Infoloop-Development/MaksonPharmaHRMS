import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { leaveApi } from '../../api/leave';
import { useToast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { Field, Input } from '../ui/Field';

export type HolidayRow = {
  id: string;
  name: string;
  date: string;
  type: string;
  departments: string[];
  locations: string[];
};

const HOLIDAY_TYPES = [
  { value: 'National' as const, label: 'National', desc: 'Public holiday for all locations' },
  { value: 'Regional' as const, label: 'Regional', desc: 'Applies to specific states or regions' },
  { value: 'Company' as const, label: 'Company', desc: 'Internal company-wide day off' },
];

export function HolidayFormModal({
  mode,
  initial,
  onClose,
  onSuccess,
}: {
  mode: 'create' | 'edit';
  initial?: HolidayRow;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast((s) => s.push);
  const [name, setName] = useState(initial?.name ?? '');
  const [date, setDate] = useState(initial?.date ?? '');
  const [type, setType] = useState<'National' | 'Regional' | 'Company'>(
    (initial?.type as 'National' | 'Regional' | 'Company') ?? 'National'
  );

  const saveMu = useMutation({
    mutationFn: async () => {
      const body = { name: name.trim(), date, type, departments: [] as string[], locations: [] as string[] };
      if (mode === 'create') return leaveApi.createHoliday(body);
      return leaveApi.patchHoliday(initial!.id, body);
    },
    onSuccess: () => {
      toast(mode === 'create' ? 'Holiday added' : 'Holiday updated', 'success');
      onSuccess();
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  return (
    <Modal
      open
      title={mode === 'create' ? 'Add holiday' : 'Edit holiday'}
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" disabled={!name.trim() || !date || saveMu.isPending} onClick={() => saveMu.mutate()}>
            {saveMu.isPending ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <p className="text-sm text-text-muted mb-4">
        Applies to all employees unless scoped (future).
      </p>

      <Field label="Holiday type" required>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {HOLIDAY_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={`text-left p-3 rounded-lg border-2 transition-colors ${
                type === t.value
                  ? 'border-primary bg-primary-bg/40'
                  : 'border-border bg-surface2 hover:border-primary/40'
              }`}
            >
              <div className="font-semibold text-sm">{t.label}</div>
              <div className="text-xs text-text-muted mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <Field label="Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Republic Day" />
        </Field>
        <Field label="Date" required>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
