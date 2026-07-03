import { useEffect, useState } from 'react';
import { apiBasePath } from '../../api/apiBase';
import { useAuth } from '../../store/auth';

/** Fetches authenticated bug report video and renders with native controls. */
export function BugReportVideoPlayer({ reportId }: { reportId: string }) {
  const accessToken = useAuth((s) => s.accessToken);
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;

    async function load() {
      if (!accessToken) {
        setError('Not authenticated');
        return;
      }
      try {
        const res = await fetch(`${apiBasePath()}/admin/bug-reporting/${encodeURIComponent(reportId)}/video`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) {
          throw new Error('Failed to load video');
        }
        const blob = await res.blob();
        if (cancelled) return;
        revoked = URL.createObjectURL(blob);
        setSrc(revoked);
        setError(null);
      } catch {
        if (!cancelled) setError('Could not load screen recording.');
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [accessToken, reportId]);

  if (error) {
    return <p className="text-sm text-text-muted">{error}</p>;
  }
  if (!src) {
    return <p className="text-sm text-text-muted">Loading video…</p>;
  }

  return (
    <video
      controls
      src={src}
      className="w-full max-h-[420px] rounded-md border border-border bg-black"
      preload="metadata"
    />
  );
}
