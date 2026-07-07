import { useState } from 'react';
import { Modal } from '../../ui/Modal';
import { useToast } from '../../ui/Toast';

export function OneTimePasswordDialog({
  open,
  email,
  password,
  onClose,
}: {
  open: boolean;
  email: string;
  password: string;
  onClose: () => void;
}) {
  const toast = useToast((s) => s.push);
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast('Password copied', 'success');
    } catch {
      toast('Failed to copy password', 'error');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="IT Admin account created"
      size="sm"
      footer={
        <button type="button" className="btn-primary" onClick={onClose}>
          Done
        </button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
          Copy this password now — it won&apos;t be shown again. Share it with the new IT Admin manually.
        </p>
        <div>
          <p className="text-xs text-text-muted mb-1">Email</p>
          <p className="text-sm font-medium break-all">{email}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted mb-1">Temporary password</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono bg-surface2 border border-border rounded-md px-3 py-2 break-all">
              {password}
            </code>
            <button type="button" className="btn-outline btn-sm shrink-0" onClick={onCopy}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
        <p className="text-xs text-text-muted">
          They must change this password on first login.
        </p>
      </div>
    </Modal>
  );
}
