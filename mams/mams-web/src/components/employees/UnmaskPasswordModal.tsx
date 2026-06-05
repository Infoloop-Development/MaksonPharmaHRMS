import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Field, Input } from '../ui/Field';
import { SENSITIVE_UNMASK_FIELD_LABELS, type SensitiveUnmaskField } from '@mams/types';

export function UnmaskPasswordModal({
  field,
  open,
  onClose,
  onConfirm,
  loading,
  passwordError,
  onClearPasswordError,
}: {
  field: SensitiveUnmaskField;
  open: boolean;
  onClose: () => void;
  onConfirm: (password: string, reason?: string) => void | Promise<void>;
  loading?: boolean;
  passwordError?: string | null;
  onClearPasswordError?: () => void;
}) {
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleClose = () => {
    setPassword('');
    setReason('');
    setShowPassword(false);
    onClearPasswordError?.();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Unmask ${SENSITIVE_UNMASK_FIELD_LABELS[field]}`}
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
            onClick={() => onConfirm(password, reason.trim() || undefined)}
          >
            {loading ? 'Verifying…' : 'Reveal'}
          </button>
        </>
      }
    >
      <p className="text-sm text-text-muted mb-4">
        Enter your <strong>login password</strong> to view this employee&apos;s {SENSITIVE_UNMASK_FIELD_LABELS[field]}.
        This action is recorded in the audit log.
      </p>
      <Field label="Your password" required error={passwordError ?? undefined}>
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              onClearPasswordError?.();
            }}
            autoComplete="current-password"
            className="pr-11"
            aria-invalid={passwordError ? true : undefined}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </Field>
      <Field label="Reason (optional)" hint="Stored in the audit log">
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. payroll verification" />
      </Field>
    </Modal>
  );
}
