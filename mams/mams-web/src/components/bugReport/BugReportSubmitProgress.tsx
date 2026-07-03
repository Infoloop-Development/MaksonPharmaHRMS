import type { SubmitBugReportProgress } from '../../lib/bugReport/submitBugReport';

type Props = {
  progress: SubmitBugReportProgress;
  hasVideo: boolean;
};

function overallPercent(progress: SubmitBugReportProgress, hasVideo: boolean): number {
  if (!hasVideo) {
    return progress.stage === 'metadata' && progress.percent >= 100 ? 100 : Math.max(8, progress.percent);
  }
  if (progress.stage === 'metadata') {
    return progress.percent >= 100 ? 22 : 8;
  }
  return 22 + Math.round(progress.percent * 0.78);
}

function stageLabel(progress: SubmitBugReportProgress, hasVideo: boolean): string {
  if (progress.stage === 'metadata') {
    return hasVideo ? 'Saving report details…' : 'Submitting bug report…';
  }
  return 'Uploading screen recording…';
}

export function BugReportSubmitProgress({ progress, hasVideo }: Props) {
  const percent = overallPercent(progress, hasVideo);
  const label = stageLabel(progress, hasVideo);

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

      {hasVideo && (
        <ol className="flex items-center gap-2 mb-3 text-[11px]" aria-hidden>
          <li
            className={`flex items-center gap-1.5 ${
              progress.stage === 'metadata' && progress.percent < 100
                ? 'text-text font-medium'
                : 'text-text-muted'
            }`}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                progress.stage === 'video' || progress.percent >= 100
                  ? 'bg-primary text-white'
                  : 'border border-primary/40 bg-primary-bg text-primary-on-bg'
              }`}
            >
              {progress.stage === 'video' || progress.percent >= 100 ? (
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                '1'
              )}
            </span>
            Report
          </li>
          <li className="h-px flex-1 bg-border max-w-[2rem]" />
          <li
            className={`flex items-center gap-1.5 ${
              progress.stage === 'video' ? 'text-text font-medium' : 'text-text-muted'
            }`}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                progress.stage === 'video'
                  ? 'border border-primary/40 bg-primary-bg text-primary-on-bg'
                  : 'border border-border text-text-muted'
              }`}
            >
              2
            </span>
            Video
          </li>
        </ol>
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
