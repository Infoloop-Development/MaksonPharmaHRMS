import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Field, Input } from '../ui/Field';
import { PasswordInput } from '../ui/PasswordInput';
import { SENSITIVE_UNMASK_FIELD_LABELS, type SensitiveUnmaskField } from '@mams/types';

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function UnmaskPasswordModal({
  field,
  employeeName,
  employeeCode,
  open,
  onClose,
  onConfirm,
  loading,
  passwordError,
  onClearPasswordError,
}: {
  field: SensitiveUnmaskField;
  employeeName?: string;
  employeeCode?: string;
  open: boolean;
  onClose: () => void;
  onConfirm: (password: string, reason?: string) => void | Promise<void>;
  loading?: boolean;
  passwordError?: string | null;
  onClearPasswordError?: () => void;
}) {
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const fieldLabel = SENSITIVE_UNMASK_FIELD_LABELS[field];

  const handleClose = () => {
    setPassword('');
    setReason('');
    onClearPasswordError?.();
    onClose();
  };

  const submit = () => {
    if (loading || !password.trim()) return;
    onConfirm(password, reason.trim() || undefined);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Unmask ${fieldLabel}`}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={handleClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={loading || !password.trim()}
            onClick={submit}
          >
            {loading ? 'Verifying…' : 'Reveal'}
          </button>
        </>
      }
    >
      <div className="flex gap-3 rounded-md border border-primary/20 bg-primary-bg p-3 mb-5">
        <span className="shrink-0 mt-0.5 text-primary">
          <LockIcon />
        </span>
        <p className="text-sm text-text leading-relaxed">
          Enter your <strong>login password</strong> to view {employeeName ? (
            <>
              <strong>{employeeName}</strong>
              {employeeCode ? <span className="text-text-muted">{' '}({employeeCode})</span> : null}
              &apos;s
            </>
          ) : (
            "this employee's"
          )}{' '}
          {fieldLabel}. This action is recorded in the audit log.
        </p>
      </div>
      <div className="space-y-4">
        <Field label="Your password" required error={passwordError ?? undefined}>
          <PasswordInput
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              onClearPasswordError?.();
            }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            autoComplete="current-password"
            autoFocus
            className="input"
            aria-invalid={passwordError ? true : undefined}
          />
        </Field>
        <Field label="Reason (optional)" hint="Stored in the audit log">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="e.g. payroll verification"
          />
        </Field>
      </div>
    </Modal>
  );
}
