import { useEffect, useState } from 'react';
import { copyToClipboard, downloadQrPng, generateQrDataUrl, printQrCode } from '../../lib/visitorQr';
import { useToast } from '../ui/Toast';

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
      className="rounded border border-border bg-white"
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

  useEffect(() => {
    let cancelled = false;
    generateQrDataUrl(publicUrl, compact ? 96 : 200).then((url) => {
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
      await downloadQrPng(publicUrl, `${safeName}-qr.png`);
      toast('QR code downloaded', 'success');
    } catch {
      toast('Failed to download QR code', 'error');
    }
  };

  const onPrint = async () => {
    try {
      const url = qrDataUrl ?? (await generateQrDataUrl(publicUrl, 280));
      printQrCode(title, publicUrl, url);
    } catch {
      toast('Failed to open print view', 'error');
    }
  };

  return (
    <div className={compact ? 'flex flex-wrap items-center gap-3' : 'flex flex-col sm:flex-row gap-4 items-start'}>
      {qrDataUrl && (
        <img
          src={qrDataUrl}
          alt="QR code"
          className="rounded border border-border bg-white shrink-0"
          width={compact ? 72 : 160}
          height={compact ? 72 : 160}
        />
      )}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            readOnly
            value={publicUrl}
            className="input flex-1 min-w-[200px] text-xs font-mono"
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
  );
}
