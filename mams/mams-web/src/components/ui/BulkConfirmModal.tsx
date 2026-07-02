import { useState } from 'react';
import type { BulkMutationResult } from '@mams/types';
import { Modal } from './Modal';

export function BulkConfirmModal({
  open,
  onClose,
  title,
  description,
  itemLabels,
  confirmLabel,
  onConfirm,
  extraContent,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: React.ReactNode;
  itemLabels?: string[];
  confirmLabel: string;
  onConfirm: () => Promise<BulkMutationResult | void>;
  extraContent?: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkMutationResult | null>(null);

  const handleClose = () => {
    if (busy) return;
    setError(null);
    setResult(null);
    onClose();
  };

  const handleConfirm = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await onConfirm();
      if (res && (res.errors.length > 0 || res.skipped > 0)) {
        setResult(res);
      } else {
        handleClose();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Operation failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      footer={
        result ? (
          <button type="button" className="btn-primary" onClick={handleClose}>
            Close
          </button>
        ) : (
          <>
            <button type="button" className="btn-outline" onClick={handleClose} disabled={busy}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary bg-red hover:bg-red/90"
              disabled={busy}
              onClick={handleConfirm}
            >
              {busy ? 'Working…' : confirmLabel}
            </button>
          </>
        )
      }
    >
      {!result ? (
        <div className="space-y-3 text-sm">
          <div className="text-text-muted">{description}</div>
          {itemLabels && itemLabels.length > 0 && (
            <ul className="list-disc pl-5 text-text-muted space-y-0.5">
              {itemLabels.slice(0, 5).map((label) => (
                <li key={label}>{label}</li>
              ))}
              {itemLabels.length > 5 && (
                <li className="list-none -ml-5 text-text-subtle">
                  …and {itemLabels.length - 5} more
                </li>
              )}
            </ul>
          )}
          {extraContent}
          {error && (
            <p className="text-red" role="alert">
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <p>
            <strong>{result.succeeded}</strong> succeeded, <strong>{result.skipped}</strong> skipped.
          </p>
          {result.errors.length > 0 && (
            <ul className="max-h-40 overflow-y-auto rounded border border-border bg-surface2/50 p-3 text-xs space-y-1">
              {result.errors.map((e) => (
                <li key={e.id}>
                  <span className="font-mono text-text-subtle">{e.id.slice(-6)}</span>: {e.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
