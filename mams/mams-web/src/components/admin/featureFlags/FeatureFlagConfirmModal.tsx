import type { FeatureFlagState } from '@mams/types';
import { Modal } from '../../ui/Modal';

export function FeatureFlagConfirmModal({
  flag,
  nextEnabled,
  busy,
  onConfirm,
  onClose,
}: {
  flag: FeatureFlagState;
  nextEnabled: boolean;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      title={nextEnabled ? `Enable ${flag.label}?` : `Disable ${flag.label}?`}
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn-primary" disabled={busy} onClick={onConfirm}>
            {busy ? 'Saving…' : nextEnabled ? 'Enable flag' : 'Disable flag'}
          </button>
        </>
      }
    >
      <p className="text-sm text-text-muted mb-3">{flag.description}</p>
      {flag.impactBullets && flag.impactBullets.length > 0 && (
        <ul className="text-sm space-y-2 list-disc pl-5 text-text-muted">
          {flag.impactBullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      )}
      {flag.requiresWebRebuild && (
        <p className="text-xs text-amber mt-4 bg-amber-bg border border-amber/30 rounded-lg px-3 py-2">
          Updating the server flag takes effect immediately for API checks. The web UI may need a Netlify rebuild with
          matching <code className="font-mono">{flag.webEnvKey}</code>.
        </p>
      )}
    </Modal>
  );
}
