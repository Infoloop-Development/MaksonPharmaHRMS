import { useBugReport } from './BugReportContext';
import { BugReportRecordingDock } from './BugReportRecordingHud';
import { BugReportRecordingPip } from './BugReportRecordingPip';
import { NavIcon } from '../navIcons';

type Props = {
  collapsed?: boolean;
};

/** Report bug + recording controls docked at the bottom of the left sidebar. */
export function BugReportSidebarFooter({ collapsed = false }: Props) {
  const {
    hidden,
    capturing,
    isRecordingUi,
    recorder,
    onOpen,
    onStopRecording,
  } = useBugReport();

  if (hidden) return null;

  const showReportButton = !isRecordingUi && recorder.phase !== 'acquiring';
  const showWebcamPip =
    recorder.mode === 'screen_webcam' && (isRecordingUi || recorder.phase === 'acquiring');

  return (
    <div
      data-bug-report-ignore
      className="bug-report-sidebar-footer shrink-0 p-2 lg:p-3 space-y-2"
    >
      {showWebcamPip && isRecordingUi && (
        <BugReportRecordingPip stream={recorder.webcamPreviewStream} inline />
      )}

      {recorder.phase === 'acquiring' && (
        <div className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-black/20 px-2 py-2 text-[11px] sidebar-muted">
          <span className="bug-report-acquiring-spinner shrink-0" aria-hidden />
          <span className={collapsed ? 'sr-only' : ''}>Pick a screen…</span>
        </div>
      )}

      {isRecordingUi && (
        <BugReportRecordingDock
          remainingLabel={recorder.remainingLabel}
          remainingMs={recorder.remainingMs}
          maxDurationMs={recorder.maxDurationMs}
          phase={recorder.phase === 'paused' ? 'paused' : 'recording'}
          onPause={recorder.pauseRecording}
          onResume={recorder.resumeRecording}
          onStop={onStopRecording}
          compact={collapsed}
        />
      )}

      {showReportButton && (
        <button
          type="button"
          className={`bug-report-sidebar-btn w-full min-h-[44px] rounded-lg px-3 py-2.5 text-sm font-semibold transition-opacity touch-target flex items-center justify-center gap-2 ${
            capturing ? 'opacity-70 cursor-wait' : ''
          } ${collapsed ? 'lg:px-2' : ''}`}
          onClick={() => void onOpen()}
          disabled={capturing || recorder.isActive}
          aria-label="Report bug"
          title={collapsed ? 'Report bug' : undefined}
        >
          {collapsed ? (
            <NavIcon name="bug" />
          ) : (
            <span>{capturing ? 'Capturing…' : 'Report Bug'}</span>
          )}
        </button>
      )}
    </div>
  );
}

/** Mobile fallback when the sidebar drawer is closed. */
export function BugReportMobileTrigger({ suppressed = false }: { suppressed?: boolean }) {
  const {
    hidden,
    capturing,
    isRecordingUi,
    recorder,
    onOpen,
    onStopRecording,
  } = useBugReport();

  if (hidden || suppressed) return null;

  const showReportButton = !isRecordingUi && recorder.phase !== 'acquiring';
  const showWebcamPip = recorder.mode === 'screen_webcam' && isRecordingUi;

  return (
    <div
      data-bug-report-ignore
      className="bug-report-mobile-trigger lg:hidden fixed left-3 z-[80] max-w-[min(220px,calc(100vw-1.5rem))] space-y-2"
      style={{ bottom: 'max(5rem, calc(4.5rem + env(safe-area-inset-bottom)))' }}
    >
      {showWebcamPip && <BugReportRecordingPip stream={recorder.webcamPreviewStream} inline />}

      {recorder.phase === 'acquiring' && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 shadow-floating text-xs text-text-muted">
          <span className="bug-report-acquiring-spinner shrink-0" aria-hidden />
          <span>Pick a screen…</span>
        </div>
      )}

      {isRecordingUi && (
        <div className="rounded-xl border border-border bg-surface p-2 shadow-floating">
          <BugReportRecordingDock
            remainingLabel={recorder.remainingLabel}
            remainingMs={recorder.remainingMs}
            maxDurationMs={recorder.maxDurationMs}
            phase={recorder.phase === 'paused' ? 'paused' : 'recording'}
            onPause={recorder.pauseRecording}
            onResume={recorder.resumeRecording}
            onStop={onStopRecording}
            tone="surface"
          />
        </div>
      )}

      {showReportButton && (
        <button
          type="button"
          className="btn-primary shadow-floating rounded-full px-4 py-2.5 text-sm font-semibold min-h-[44px]"
          onClick={() => void onOpen()}
          disabled={capturing}
        >
          {capturing ? 'Capturing…' : 'Report Bug'}
        </button>
      )}
    </div>
  );
}
