import { useState } from 'react';
import { Modal } from '../ui/Modal';

export function RegenerateSlugDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <Modal
      open
      onClose={onCancel}
      title="Generate new public link & QR code?"
      size="md"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn bg-red text-white px-4 py-2 rounded-md text-sm font-semibold"
            disabled={!acknowledged}
            onClick={onConfirm}
          >
            Generate new link
          </button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <p className="text-text">
          This will invalidate the current public URL and QR code. All previously distributed links, printed QR codes,
          posters, signboards, emails, documents, and any other materials containing the existing QR code or URL will
          <strong> no longer direct visitors to the active form</strong>.
        </p>
        <p className="text-text-muted">
          Visitors who use old materials will see a message that the link is no longer active. You will need to replace
          every deployed QR code and link with the new ones.
        </p>
        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-md border border-amber/40 bg-amber/5">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
          />
          <span>
            I understand that all existing QR codes and links will stop working and must be replaced before visitors can
            register using this form.
          </span>
        </label>
      </div>
    </Modal>
  );
}
