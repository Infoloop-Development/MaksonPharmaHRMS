export type BugShareVariant = 'default' | 'board';

/** Path-only share link for a bug (no origin). */
export function getBugReportSharePath(publicId: string, variant: BugShareVariant = 'default'): string {
  const base = variant === 'board' ? '/admin/bug-reporting/board' : '/admin/bug-reporting';
  return `${base}/${encodeURIComponent(publicId)}`;
}

/** Full browser URL for sharing a bug report. */
export function getBugReportShareUrl(publicId: string, variant: BugShareVariant = 'default'): string {
  if (typeof window === 'undefined') return getBugReportSharePath(publicId, variant);
  return `${window.location.origin}${getBugReportSharePath(publicId, variant)}`;
}
