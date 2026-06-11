import { useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { Modal } from '../ui/Modal';
import { getCroppedImageDataUrl } from '../../lib/cropImage';
import { validateFaviconOutput } from '../../lib/brandAssetValidation';

export function FaviconCropModal({
  imageSrc,
  onClose,
  onConfirm,
  busy,
}: {
  imageSrc: string;
  onClose: () => void;
  onConfirm: (dataUrl: string) => void;
  busy?: boolean;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) {
      setError('Adjust the crop area first');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const cropped = await getCroppedImageDataUrl(imageSrc, croppedAreaPixels);
      if ('error' in cropped) {
        setError(cropped.error);
        return;
      }
      const validated = await validateFaviconOutput(cropped.dataUrl);
      if ('error' in validated) {
        setError(validated.error);
        return;
      }
      onConfirm(validated.dataUrl);
    } catch {
      setError('Failed to crop image');
    } finally {
      setSaving(false);
    }
  };

  const isBusy = saving || busy;

  return (
    <Modal
      open
      onClose={onClose}
      title="Crop favicon"
      size="md"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose} disabled={isBusy}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={isBusy}>
            {isBusy ? 'Saving...' : 'Save favicon'}
          </button>
        </>
      }
    >
      <p className="text-sm text-text-muted mb-4">
        Drag to reposition · Use the slider to zoom. The selected area is saved as a square icon (max 512×512 px).
      </p>
      <div className="relative w-full h-[280px] sm:h-[320px] rounded-lg overflow-hidden bg-surface2">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>
      <div className="mt-4">
        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Zoom</label>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full mt-2 accent-primary"
          disabled={isBusy}
        />
      </div>
      {error && <p className="mt-3 text-sm text-red">{error}</p>}
    </Modal>
  );
}
