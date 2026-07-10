import { getBugReportShareUrl, type BugShareVariant } from '../../lib/bugReport/bugShareUrl';
import { copyToClipboard } from '../../lib/visitorQr';
import { useToast } from '../ui/Toast';

function LinkIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
      aria-hidden
    >
      <path
        d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Props = {
  publicId?: string | null;
  shareVariant?: BugShareVariant;
  className?: string;
  iconClassName?: string;
  title?: string;
};

export function BugReportShareLinkButton({
  publicId,
  shareVariant = 'default',
  className = 'w-8 h-8',
  iconClassName,
  title = 'Copy share link',
}: Props) {
  const toast = useToast((s) => s.push);

  if (!publicId) return null;

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = await copyToClipboard(getBugReportShareUrl(publicId, shareVariant));
    toast(ok ? 'Link copied' : 'Could not copy link', ok ? 'success' : 'error');
  };

  return (
    <button
      type="button"
      className={`inline-flex shrink-0 items-center justify-center rounded-md text-text-muted hover:text-link hover:bg-surface2 transition-colors ${className}`}
      title={title}
      aria-label={title}
      onClick={(e) => void onClick(e)}
    >
      <LinkIcon className={iconClassName ?? 'w-4 h-4'} />
    </button>
  );
}
