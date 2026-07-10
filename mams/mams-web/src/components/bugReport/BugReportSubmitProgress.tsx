import type { SubmitBugReportProgress } from '../../lib/bugReport/submitBugReport';

type Props = {
  progress: SubmitBugReportProgress;
  hasVideo: boolean;
  hasAttachments: boolean;
};

function overallPercent(
  progress: SubmitBugReportProgress,
  hasVideo: boolean,
  hasAttachments: boolean
): number {
  const stages: SubmitBugReportProgress['stage'][] = ['metadata'];
  if (hasAttachments) stages.push('attachments');
  if (hasVideo) stages.push('video');
  const idx = stages.indexOf(progress.stage);
  const slice = 100 / stages.length;
  const base = idx * slice;
  if (progress.percent >= 100 && idx === stages.length - 1) return 100;
  return Math.min(99, Math.round(base + (progress.percent / 100) * slice));
}

function stageLabel(
  progress: SubmitBugReportProgress,
  hasVideo: boolean,
  hasAttachments: boolean
): string {
  if (progress.stage === 'metadata') {
    return hasVideo || hasAttachments ? 'Saving report details…' : 'Submitting bug report…';
  }
  if (progress.stage === 'attachments') return 'Uploading supporting files…';
  return 'Uploading screen recording…';
}

export function BugReportSubmitProgress({ progress, hasVideo, hasAttachments }: Props) {
  const percent = overallPercent(progress, hasVideo, hasAttachments);
  const label = stageLabel(progress, hasVideo, hasAttachments);
  const multiStep = hasVideo || hasAttachments;

  return (
    <div
      className="bug-report-submit-progress mb-5 rounded-xl border border-border bg-surface2/60 px-4 py-3.5"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-sm font-medium text-text">{label}</p>
        <span className="text-sm font-semibold tabular-nums text-text-muted shrink-0">{percent}%</span>
      </div>

      {multiStep && (
        <p className="text-[11px] text-text-muted mb-3">
          Step: {progress.stage === 'metadata' ? '1' : progress.stage === 'attachments' ? '2' : hasAttachments ? '3' : '2'}{' '}
          of {(hasAttachments ? 1 : 0) + (hasVideo ? 1 : 0) + 1}
        </p>
      )}

      <div className="bug-report-submit-progress-track">
        <div
          className="bug-report-submit-progress-fill"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
