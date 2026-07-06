import { useEffect, useState } from 'react';
import type { BugReportAttachment } from '@mams/types';
import { apiBasePath } from '../../api/apiBase';
import { useAuth } from '../../store/auth';

function AttachmentPreview({
  reportId,
  attachment,
}: {
  reportId: string;
  attachment: BugReportAttachment;
}) {
  const accessToken = useAuth((s) => s.accessToken);
  const [src, setSrc] = useState<string | null>(null);
  const isImage = attachment.mimeType.startsWith('image/');

  useEffect(() => {
    if (!isImage || !accessToken) return;
    let revoked: string | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(
          `${apiBasePath()}/admin/bug-reporting/${encodeURIComponent(reportId)}/attachments/${encodeURIComponent(attachment.id)}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!res.ok) throw new Error('load failed');
        const blob = await res.blob();
        if (cancelled) return;
        revoked = URL.createObjectURL(blob);
        setSrc(revoked);
      } catch {
        if (!cancelled) setSrc(null);
      }
    })();

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [accessToken, reportId, attachment.id, isImage]);

  const download = async () => {
    if (!accessToken) return;
    const res = await fetch(
      `${apiBasePath()}/admin/bug-reporting/${encodeURIComponent(reportId)}/attachments/${encodeURIComponent(attachment.id)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.originalName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <li className="rounded-lg border border-border bg-surface2/40 p-3 flex flex-col gap-2">
      {isImage && src ? (
        <img
          src={src}
          alt={attachment.originalName}
          className="w-full max-h-48 object-contain rounded border border-border bg-surface"
        />
      ) : (
        <div className="flex h-24 items-center justify-center rounded border border-border bg-surface text-sm font-semibold text-text-muted">
          PDF
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{attachment.originalName}</p>
        <p className="text-xs text-text-muted">
          {(attachment.size / 1024).toFixed(0)} KB · {attachment.mimeType}
        </p>
      </div>
      <button type="button" className="btn-outline btn-sm w-full" onClick={() => void download()}>
        Download
      </button>
    </li>
  );
}

export function BugReportAttachmentsSection({
  reportId,
  attachments,
}: {
  reportId: string;
  attachments: BugReportAttachment[];
}) {
  if (!attachments.length) return null;

  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold mb-2">Supporting files ({attachments.length})</h3>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {attachments.map((a) => (
          <AttachmentPreview key={a.id} reportId={reportId} attachment={a} />
        ))}
      </ul>
    </div>
  );
}
