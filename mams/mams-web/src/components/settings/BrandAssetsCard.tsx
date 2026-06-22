import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, type Settings } from '../../api/settings';
import { useToast } from '../ui/Toast';
import { ACTIVITY_QUERY_PREFIX } from '../../api/activity';
import {
  isFaviconRasterMime,
  validateAndReadFavicon,
  validateAndReadLogo,
  validateFaviconSourceForCrop,
} from '../../lib/brandAssetValidation';
import { FaviconCropModal } from './FaviconCropModal';

function InfoTip({ text }: { text: string }) {
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-surface2 border border-border text-[10px] font-bold text-text-muted cursor-help"
      title={text}
    >
      i
    </span>
  );
}

function UploadZone({
  label,
  hint,
  accept,
  preview,
  placeholderIcon,
  placeholderText,
  formatHint,
  specs,
  recommended,
  appearsIn,
  disabled,
  busy,
  onPick,
  onRemove,
  inputId,
}: {
  label: string;
  hint: string;
  accept: string;
  preview: string | null;
  placeholderIcon: string;
  placeholderText: string;
  formatHint: string;
  specs: string;
  recommended: string;
  appearsIn: string;
  disabled: boolean;
  busy: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
  inputId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-sm font-semibold">{label}</span>
        <InfoTip text={hint} />
      </div>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        className="w-full min-h-[120px] rounded-lg border-2 border-dashed border-border bg-surface2 p-5 text-center transition hover:border-primary/40 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {preview ? (
          <div className="flex flex-col items-center">
            <img src={preview} alt={label} className="max-w-[140px] max-h-20 object-contain mb-2" />
            <div className="text-xs text-text-muted">Click to change</div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-text-muted">
            <div className="text-3xl mb-2 opacity-40">{placeholderIcon}</div>
            <div className="text-sm font-medium">{placeholderText}</div>
            <div className="text-xs mt-1">{formatHint}</div>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled || busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = '';
        }}
      />
      <div className="mt-3 space-y-1 text-xs text-text-muted">
        <div>
          <span className="font-semibold text-text">Specs:</span> {specs}
        </div>
        <div>
          <span className="font-semibold text-text">Recommended:</span> {recommended}
        </div>
        <div>
          <span className="font-semibold text-text">Appears in:</span> {appearsIn}
        </div>
      </div>
      {preview && !disabled && (
        <button type="button" className="btn-outline btn-sm mt-3 text-xs" disabled={busy} onClick={onRemove}>
          Remove {label.toLowerCase()}
        </button>
      )}
    </div>
  );
}

export function BrandAssetsCard({
  settings,
  canManage,
  onLogoUpdated,
}: {
  settings: Settings;
  canManage: boolean;
  onLogoUpdated?: (dataUrl: string | null) => void;
}) {
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const patchMu = useMutation({
    mutationFn: (body: Partial<Pick<Settings, 'companyLogo' | 'favicon'>>) => settingsApi.patch(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      qc.invalidateQueries({ queryKey: ACTIVITY_QUERY_PREFIX });
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const busy = patchMu.isPending;

  const saveLogo = async (file: File) => {
    const result = await validateAndReadLogo(file);
    if ('error' in result) {
      toast(result.error, 'error');
      return;
    }
    patchMu.mutate(
      { companyLogo: result.dataUrl },
      {
        onSuccess: () => {
          onLogoUpdated?.(result.dataUrl);
          toast('Company logo updated', 'success');
        },
      }
    );
  };

  const saveFavicon = async (file: File) => {
    if (isFaviconRasterMime(file.type)) {
      const result = await validateFaviconSourceForCrop(file);
      if ('error' in result) {
        toast(result.error, 'error');
        return;
      }
      setCropSrc(result.dataUrl);
      return;
    }
    const result = await validateAndReadFavicon(file);
    if ('error' in result) {
      toast(result.error, 'error');
      return;
    }
    patchMu.mutate({ favicon: result.dataUrl }, { onSuccess: () => toast('Favicon updated', 'success') });
  };

  const confirmCroppedFavicon = (dataUrl: string) => {
    patchMu.mutate(
      { favicon: dataUrl },
      {
        onSuccess: () => {
          setCropSrc(null);
          toast('Favicon updated', 'success');
        },
      }
    );
  };

  const removeLogo = () => {
    patchMu.mutate(
      { companyLogo: null },
      {
        onSuccess: () => {
          onLogoUpdated?.(null);
          toast('Logo removed', 'success');
        },
      }
    );
  };

  const removeFavicon = () => {
    patchMu.mutate({ favicon: null }, { onSuccess: () => toast('Favicon removed', 'success') });
  };

  return (
    <div className="card p-5 md:p-6">
      <h3 className="text-base font-bold mb-1">Brand Assets</h3>
      <p className="text-sm text-text-muted mb-6">
        Upload your company logo and favicon. Files are validated for format, size, and dimensions to ensure proper
        display across reports and browser.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <UploadZone
          inputId="logo-upload"
          label="Company Logo"
          hint="Used in sidebar and report headers. Upload a square or landscape PNG/SVG/JPG. Min 200×200 px, max 2000×2000 px, max 500 KB. Recommended: 400×400 px transparent PNG."
          accept=".png,.svg,.jpg,.jpeg,image/png,image/svg+xml,image/jpeg"
          preview={settings.companyLogo}
          placeholderIcon="📷"
          placeholderText="Click to upload logo"
          formatHint="PNG, SVG, or JPG"
          specs="200–2000 px | Max 500 KB | PNG/SVG/JPG"
          recommended="400×400 px transparent PNG"
          appearsIn="Sidebar, all report print headers"
          disabled={!canManage}
          busy={busy}
          onPick={saveLogo}
          onRemove={removeLogo}
        />
        <UploadZone
          inputId="favicon-upload"
          label="Favicon / Browser Icon"
          hint="Upload any photo ratio, then crop and zoom like a profile picture. SVG and ICO upload as-is. Max 512×512 px, max 500 KB."
          accept=".ico,.png,.svg,.jpg,.jpeg,image/x-icon,image/png,image/svg+xml,image/jpeg"
          preview={settings.favicon}
          placeholderIcon="🌐"
          placeholderText="Click to upload favicon"
          formatHint="ICO, PNG, JPG, or SVG"
          specs="Crop to square · Max 512×512 px · Max 500 KB"
          recommended="32×32 or 64×64 px PNG"
          appearsIn="Browser tab icon"
          disabled={!canManage}
          busy={busy}
          onPick={saveFavicon}
          onRemove={removeFavicon}
        />
      </div>
      {cropSrc && (
        <FaviconCropModal
          imageSrc={cropSrc}
          onClose={() => setCropSrc(null)}
          onConfirm={confirmCroppedFavicon}
          busy={busy}
        />
      )}
    </div>
  );
}
