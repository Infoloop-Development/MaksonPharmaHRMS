import type { RecordingMode } from '../../lib/bugReport/useBugReportRecorder';
import { BugReportCameraIcon, BugReportMonitorIcon } from './BugReportIcons';

type Props = {
  onSelect: (mode: RecordingMode) => void;
  onCancel: () => void;
};

const OPTIONS: {
  mode: RecordingMode;
  title: string;
  description: string;
  badge?: string;
  icon: typeof BugReportMonitorIcon;
}[] = [
  {
    mode: 'screen',
    title: 'Screen only',
    description: 'Share your screen and tab audio.',
    badge: 'Recommended',
    icon: BugReportMonitorIcon,
  },
  {
    mode: 'screen_webcam',
    title: 'Screen + webcam',
    description: 'Include a small camera preview while you explain.',
    icon: BugReportCameraIcon,
  },
];

export function BugReportRecordingModePicker({ onSelect, onCancel }: Props) {
  return (
    <div className="bug-report-mode-picker space-y-4" role="group" aria-labelledby="bug-report-mode-heading">
      <div>
        <h3 id="bug-report-mode-heading" className="text-sm font-semibold text-text">
          Choose recording setup
        </h3>
        <p className="text-xs text-text-muted mt-1 leading-relaxed">
          Your browser will ask which screen or window to share. Use the floating bar to pause or stop.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {OPTIONS.map(({ mode, title, description, badge, icon: Icon }) => (
          <button
            key={mode}
            type="button"
            className="bug-report-mode-card group w-full text-left rounded-xl border border-border bg-surface p-4 transition-all duration-200 hover:border-primary/50 hover:bg-surface2/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            onClick={() => onSelect(mode)}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-bg text-primary-on-bg group-hover:bg-primary/20 transition-colors">
                <Icon className="w-5 h-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold whitespace-nowrap">{title}</span>
                  {badge && (
                    <span className="rounded-full bg-primary-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-on-bg whitespace-nowrap">
                      {badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">{description}</p>
              </div>
              <span
                className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-text-muted group-hover:border-primary/40 group-hover:text-link transition-colors"
                aria-hidden
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-end pt-1">
        <button type="button" className="btn-outline min-h-[44px] px-4" onClick={onCancel}>
          Back
        </button>
      </div>
    </div>
  );
}
