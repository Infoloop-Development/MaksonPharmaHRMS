import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../../api/settings';
import { brandingFromSettings } from '../../lib/companyBranding';
import {
  copyToClipboard,
  downloadQrPng,
  generateQrDataUrl,
  printQrCode,
  type QrStickerBranding,
} from '../../lib/visitorQr';
import { useToast } from '../ui/Toast';

function QrStickerPreview({
  qrDataUrl,
  branding,
  compact,
}: {
  qrDataUrl: string;
  branding: QrStickerBranding;
  compact: boolean;
}) {
  const qrSize = compact ? 64 : 160;

  return (
    <div
      className={`flex flex-col items-center text-center shrink-0 rounded border border-border bg-surface ${
        compact ? 'w-fit gap-1 p-2' : 'max-w-[240px] gap-2 p-2'
      }`}
    >
      <div
        className={`flex items-center justify-center gap-1.5 w-full ${
          branding.companyLogo ? '' : 'justify-center'
        }`}
      >
        {branding.companyLogo && (
          <>
            <img
              src={branding.companyLogo}
              alt="Company logo"
              className={`object-contain shrink-0 ${
                compact ? 'max-h-8 max-w-[56px]' : 'max-h-10 max-w-[72px]'
              }`}
            />
            <span
              className={`w-px self-stretch bg-border shrink-0 ${compact ? 'min-h-[24px]' : 'min-h-[32px]'}`}
              aria-hidden
            />
          </>
        )}
        <p
          className={`font-semibold text-text leading-snug flex-1 min-w-0 ${
            compact ? 'text-[10px] line-clamp-2 text-left' : 'text-xs'
          } ${branding.companyLogo ? 'text-left' : 'text-center'}`}
        >
          {branding.companyName}
        </p>
      </div>
      <img src={qrDataUrl} alt="QR code" width={qrSize} height={qrSize} className="block" />
      <p
        className={`font-semibold text-text leading-snug ${
          compact ? 'text-[11px] line-clamp-2' : 'text-sm font-bold'
        }`}
      >
        {branding.formTitle}
      </p>
    </div>
  );
}

export function FormQrPreview({ publicUrl, size = 96 }: { publicUrl: string; size?: number }) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    generateQrDataUrl(publicUrl, size).then((url) => {
      if (!cancelled) setQrUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [publicUrl, size]);

  if (!qrUrl) {
    return <div className="bg-surface2 rounded animate-pulse" style={{ width: size, height: size }} />;
  }

  return (
    <img
      src={qrUrl}
      alt="QR code for visitor form"
      width={size}
      height={size}
      className="rounded border border-border bg-surface"
    />
  );
}

export function FormQrActions({
  title,
  publicUrl,
  compact = false,
}: {
  title: string;
  publicUrl: string;
  compact?: boolean;
}) {
  const toast = useToast((s) => s.push);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
    staleTime: 60_000,
  });

  const branding = useMemo<QrStickerBranding>(() => {
    const b = brandingFromSettings(settings);
    return {
      companyName: b.companyName,
      companyLogo: b.companyLogo,
      formTitle: title,
    };
  }, [settings, title]);

  useEffect(() => {
    let cancelled = false;
    const size = compact ? 64 : 200;
    generateQrDataUrl(publicUrl, size).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [publicUrl, compact]);

  const onCopy = async () => {
    const ok = await copyToClipboard(publicUrl);
    toast(ok ? 'Link copied to clipboard' : 'Could not copy link', ok ? 'success' : 'error');
  };

  const onDownload = async () => {
    try {
      const safeName = title.replace(/[^\w-]+/g, '_').slice(0, 40) || 'visitor-form';
      await downloadQrPng(publicUrl, branding, `${safeName}-qr.png`);
      toast('QR sticker downloaded', 'success');
    } catch {
      toast('Failed to download QR sticker', 'error');
    }
  };

  const onPrint = async () => {
    try {
      const url = qrDataUrl ?? (await generateQrDataUrl(publicUrl, 280));
      printQrCode(url, branding);
    } catch {
      toast('Failed to open print view', 'error');
    }
  };

  const layoutClass = compact
    ? 'flex flex-col sm:flex-row items-start gap-3 sm:gap-4'
    : 'flex flex-col sm:flex-row gap-4 items-start';

  const bandClass = compact
    ? 'rounded-lg border border-border/60 bg-surface2/40 p-3'
    : '';

  const stickerSkeleton = compact ? (
    <div className="bg-surface2 rounded animate-pulse shrink-0 w-[120px] h-[130px]" />
  ) : (
    <div className="bg-surface2 rounded animate-pulse shrink-0 w-[240px] h-[260px]" />
  );

  return (
    <div className={bandClass}>
      <div className={layoutClass}>
        {qrDataUrl ? (
          <QrStickerPreview qrDataUrl={qrDataUrl} branding={branding} compact={compact} />
        ) : (
          stickerSkeleton
        )}
        <div className="flex-1 min-w-0 w-full space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              readOnly
              value={publicUrl}
              className="input flex-1 min-w-0 text-xs font-mono"
              onFocus={(e) => e.target.select()}
            />
            <button type="button" className="btn-outline text-sm shrink-0" onClick={onCopy}>
              Copy Link
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-outline text-sm" onClick={onDownload}>
              Download QR
            </button>
            <button type="button" className="btn-outline text-sm" onClick={onPrint}>
              Print QR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
