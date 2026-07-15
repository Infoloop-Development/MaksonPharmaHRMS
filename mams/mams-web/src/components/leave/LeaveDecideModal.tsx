import { useState } from 'react';
import type { LeaveApplicationItem } from '../../api/leave';
import { Modal } from '../ui/Modal';
import { Field, Textarea } from '../ui/Field';

export function LeaveDecideModal({
  item,
  action,
  pending,
  onClose,
  onConfirm,
}: {
  item: LeaveApplicationItem;
  action: 'approve' | 'reject';
  pending: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState('');

  return (
    <Modal
      open
      title={action === 'approve' ? 'Approve leave' : 'Reject leave'}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn-primary"
            disabled={(action === 'reject' && !note.trim()) || pending}
            onClick={() => onConfirm(note)}
          >
            {pending ? 'Saving…' : 'Confirm'}
          </button>
        </>
      }
    >
      <p className="text-sm text-text-muted mb-3">
        {item.employeeId?.name} ({item.employeeId?.empCode}): {item.totalDays} day{item.totalDays === 1 ? '' : 's'}
      </p>
      <Field label={action === 'reject' ? 'Reason (required)' : 'Note (optional)'}>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
      </Field>
    </Modal>
  );
}
