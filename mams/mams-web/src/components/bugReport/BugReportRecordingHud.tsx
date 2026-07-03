import { BugReportPauseIcon, BugReportPlayIcon, BugReportStopIcon } from './BugReportIcons';

type DockProps = {
  remainingLabel: string;
  remainingMs: number;
  maxDurationMs: number;
  phase: 'recording' | 'paused';
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  compact?: boolean;
  tone?: 'sidebar' | 'surface';
};

/** Fixed vertical recording controls for sidebar footer (not draggable). */
export function BugReportRecordingDock({
  remainingLabel,
  remainingMs,
  maxDurationMs,
  phase,
  onPause,
  onResume,
  onStop,
  compact = false,
  tone = 'sidebar',
}: DockProps) {
  const urgent = remainingMs <= 60_000;
  const pctLeft = Math.max(0, Math.min(100, (remainingMs / maxDurationMs) * 100));
  const isSidebar = tone === 'sidebar';

  return (
    <div
      data-bug-report-ignore
      className={`bug-report-recording-dock-sidebar w-full rounded-lg border p-2 ${
        isSidebar ? 'border-sidebar-border bg-black/20' : 'border-border bg-surface2'
      }`}
      role="toolbar"
      aria-label="Recording controls"
    >
      <div
        className={`flex ${compact ? 'flex-col items-center gap-2' : 'items-center gap-3'}`}
      >
        <div
          className={`flex ${compact ? 'flex-col items-center gap-1' : 'items-center gap-2'} min-w-0 flex-1`}
          role="status"
          aria-live="polite"
          aria-label={`${remainingLabel} remaining${phase === 'paused' ? ', paused' : ''}`}
        >
          <span
            className={`bug-report-recording-dot shrink-0 ${phase === 'paused' ? 'bug-report-recording-dot--paused' : ''}`}
            aria-hidden
          />
          <span
            className={`font-mono text-xs font-bold tabular-nums leading-none ${
              isSidebar ? 'sidebar-text' : 'text-text'
            } ${urgent ? 'text-red' : ''}`}
          >
            {remainingLabel}
          </span>
          {!compact && (
            <span
              className={`text-[10px] uppercase tracking-wide ${
                isSidebar ? 'sidebar-muted' : 'text-text-muted'
              }`}
            >
              left
            </span>
          )}
        </div>

        <div className={`flex ${compact ? 'flex-col' : 'flex-row'} items-center gap-1 shrink-0`}>
          {phase === 'recording' ? (
            <button
              type="button"
              className={`bug-report-dock-btn ${isSidebar ? 'bug-report-dock-btn--sidebar' : ''}`}
              onClick={onPause}
              aria-label="Pause"
            >
              <BugReportPauseIcon className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              className={`bug-report-dock-btn ${isSidebar ? 'bug-report-dock-btn--sidebar' : ''}`}
              onClick={onResume}
              aria-label="Resume"
            >
              <BugReportPlayIcon className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            className={`bug-report-dock-btn bug-report-dock-btn--stop ${
              isSidebar ? 'bug-report-dock-btn--sidebar' : ''
            }`}
            onClick={onStop}
            aria-label="Stop"
          >
            <BugReportStopIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div
        className={`mt-2 h-1 rounded-full overflow-hidden ${
          isSidebar ? 'bg-sidebar-hover-bg' : 'bg-surface'
        }`}
        aria-hidden
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            urgent ? 'bg-red' : isSidebar ? 'bg-white/70' : 'bg-brand-primary'
          }`}
          style={{ width: `${pctLeft}%` }}
        />
      </div>
    </div>
  );
}
