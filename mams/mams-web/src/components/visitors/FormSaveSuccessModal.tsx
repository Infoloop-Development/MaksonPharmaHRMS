import { Modal } from '../ui/Modal';
import { FormQrActions } from './FormQrActions';

export function FormSaveSuccessModal({
  title,
  publicUrl,
  slugRegenerated,
  onClose,
}: {
  title: string;
  publicUrl: string;
  slugRegenerated?: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      title="Form saved successfully"
      size="lg"
      footer={
        <button type="button" className="btn bg-primary text-white px-4 py-2 rounded-md text-sm font-semibold" onClick={onClose}>
          Done
        </button>
      }
    >
      <p className="text-sm text-text-muted mb-4">
        {slugRegenerated
          ? 'A new public link and QR code have been generated. Replace all previously distributed materials with the updated versions below.'
          : 'Share the public link or QR code below so visitors can submit their details without logging in.'}
      </p>
      <FormQrActions title={title} publicUrl={publicUrl} />
    </Modal>
  );
}
