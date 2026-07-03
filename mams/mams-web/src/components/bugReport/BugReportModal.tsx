import { useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import type { BugReportSeverity } from '@mams/types';
import { BUG_REPORT_SEVERITY_LABELS } from '@mams/types';
import { Modal } from '../ui/Modal';
import { Field, Input, Select, Textarea } from '../ui/Field';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../store/auth';
import {
  buildBugReportContext,
  getBreadcrumbsSnapshot,
  getConsoleBufferSnapshot,
  getFailedRequestsSnapshot,
  isBugReportRecordingSupported,
  submitBugReport,
  type SubmitBugReportProgress,
} from '../../lib/bugReport';
import type { BugReportRecorder } from '../../lib/bugReport/useBugReportRecorder';
import type { RecordingMode } from '../../lib/bugReport/useBugReportRecorder';
import { BugReportImageIcon, BugReportRecordIcon, BugReportVideoIcon } from './BugReportIcons';
import { BugReportRecordingModePicker } from './BugReportRecordingModePicker';
import { BugReportSubmitProgress } from './BugReportSubmitProgress';

type FormState = {
  title: string;
  description: string;
  severity: BugReportSeverity;
};

function AttachmentCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof BugReportImageIcon;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="bug-report-attachment-card rounded-xl border border-border bg-surface2/40 flex flex-col min-h-[160px]">
      <header className="flex items-start gap-2.5 px-3.5 py-3 border-b border-border/70 bg-surface/60">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-text-muted">
          <Icon className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-tight">{title}</h3>
          <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">{subtitle}</p>
        </div>
      </header>
      <div className="p-3.5 flex-1 flex flex-col">{children}</div>
    </section>
  );
}

export function BugReportModal({
  sessionOpen,
  visible,
  onCloseSession,
  screenshotPreview,
  recorder,
  form,
  onFormChange,
}: {
  sessionOpen: boolean;
  visible: boolean;
  onCloseSession: () => void;
  screenshotPreview: string | null;
  recorder: BugReportRecorder;
  form: FormState;
  onFormChange: (next: FormState) => void;
}) {
  const user = useAuth((s) => s.user);
  const location = useLocation();
  const toast = useToast((s) => s.push);
  const [showModeChoice, setShowModeChoice] = useState(false);
  const [submitProgress, setSubmitProgress] = useState<SubmitBugReportProgress | null>(null);

  const { title, description, severity } = form;
  const setTitle = (v: string) => onFormChange({ ...form, title: v });
  const setDescription = (v: string) => onFormChange({ ...form, description: v });
  const setSeverity = (v: BugReportSeverity) => onFormChange({ ...form, severity: v });

  const submitMu = useMutation({
    mutationFn: () =>
      submitBugReport(
        {
          title: title.trim(),
          description: description.trim(),
          severity,
          screenshotBase64: screenshotPreview ?? undefined,
          consoleLog: getConsoleBufferSnapshot(),
          breadcrumbs: getBreadcrumbsSnapshot(),
          failedRequests: getFailedRequestsSnapshot(),
          context: buildBugReportContext(location.pathname, user?.role ?? 'unknown'),
        },
        recorder.videoBlob,
        recorder.durationMs,
        setSubmitProgress
      ),
    onSuccess: () => {
      toast('Bug report submitted. Thank you.', 'success');
      onFormChange({ title: '', description: '', severity: 'medium' });
      recorder.removeVideo();
      setSubmitProgress(null);
      setShowModeChoice(false);
      onCloseSession();
    },
    onError: (e: unknown) => {
      setSubmitProgress(null);
      toast(e instanceof Error ? e.message : 'Failed to submit bug report', 'error');
    },
  });

  const canSubmit =
    sessionOpen &&
    title.trim().length >= 3 &&
    description.trim().length >= 10 &&
    !submitMu.isPending &&
    !recorder.isActive;

  const recordingSupported = isBugReportRecordingSupported();

  const startWithMode = (mode: RecordingMode) => {
    setShowModeChoice(false);
    void recorder.startRecording(mode);
  };

  if (!sessionOpen) return null;

  const hasVideo = Boolean(recorder.videoBlob && recorder.videoBlob.size > 0);
  const isSubmitting = submitMu.isPending;

  return (
    <Modal
      open={visible}
      onClose={() => {
        if (isSubmitting || recorder.isActive) return;
        onCloseSession();
      }}
      title="Report a bug"
      size="lg"
      footer={
        <>
          <button
            type="button"
            className="btn-outline min-h-[44px]"
            onClick={onCloseSession}
            disabled={isSubmitting || recorder.isActive}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary min-h-[44px] min-w-[8.5rem]"
            disabled={!canSubmit}
            onClick={() => submitMu.mutate()}
          >
            {isSubmitting ? 'Submitting…' : 'Submit report'}
          </button>
        </>
      }
    >
      {isSubmitting && (
        <BugReportSubmitProgress
          progress={submitProgress ?? { stage: 'metadata', percent: 0 }}
          hasVideo={hasVideo}
        />
      )}

      <div className={isSubmitting ? 'pointer-events-none opacity-50 transition-opacity' : undefined}>
      <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 mb-5">
        <p className="text-sm text-text leading-relaxed">
          We automatically attach a screenshot, console logs, and your navigation trail. Add a
          short screen recording if it helps explain the issue.
        </p>
      </div>

      <div className="mb-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-3">
          Attachments
        </h3>

        {showModeChoice && !recorder.previewUrl ? (
          <div className="rounded-xl border border-border bg-surface2/30 p-4 sm:p-5">
            <BugReportRecordingModePicker
              onSelect={startWithMode}
              onCancel={() => setShowModeChoice(false)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AttachmentCard
              icon={BugReportImageIcon}
              title="Screenshot"
              subtitle="Captured when you opened this report"
            >
              {screenshotPreview ? (
                <img
                  src={`data:image/jpeg;base64,${screenshotPreview}`}
                  alt="Bug report screenshot"
                  className="w-full max-h-36 object-contain rounded-lg border border-border bg-surface"
                />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface/50 px-4 py-6 text-center">
                  <p className="text-xs text-amber font-medium">Screenshot unavailable</p>
                  <p className="text-[11px] text-text-muted mt-1">
                    Console and navigation data are still included.
                  </p>
                </div>
              )}
            </AttachmentCard>

            <AttachmentCard
              icon={BugReportVideoIcon}
              title="Screen recording"
              subtitle="Optional · up to 5 minutes"
            >
              {recorder.previewUrl ? (
                <div className="flex flex-col flex-1 gap-3">
                  <video
                    controls
                    src={recorder.previewUrl}
                    className="w-full max-h-36 rounded-lg border border-border bg-black object-contain"
                  />
                  <div className="flex flex-wrap gap-2 mt-auto">
                    <button
                      type="button"
                      className="btn-outline btn-sm min-h-[40px]"
                      onClick={() => {
                        recorder.removeVideo();
                        setShowModeChoice(true);
                      }}
                    >
                      Re-record
                    </button>
                    <button
                      type="button"
                      className="btn-outline btn-sm min-h-[40px]"
                      onClick={() => recorder.removeVideo()}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col">
                  {recordingSupported ? (
                    <>
                      <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface/50 px-4 py-5 text-center">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red/10 text-red mb-3">
                          <BugReportRecordIcon className="w-5 h-5" />
                        </span>
                        <p className="text-sm font-medium">Record a walkthrough</p>
                        <p className="text-[11px] text-text-muted mt-1 max-w-[260px] leading-relaxed">
                          Show the steps to reproduce. Your browser will ask which screen to share.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn-primary w-full mt-3 min-h-[44px]"
                        disabled={recorder.isActive}
                        onClick={() => setShowModeChoice(true)}
                      >
                        Start recording
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-surface/50 px-4 py-6 text-center">
                      <p className="text-xs text-text-muted leading-relaxed">
                        Screen recording isn&apos;t supported in this browser. You can still submit
                        with the screenshot and logs.
                      </p>
                    </div>
                  )}
                  {recorder.errorMessage && (
                    <p className="text-xs text-red mt-2" role="alert">
                      {recorder.errorMessage}
                    </p>
                  )}
                </div>
              )}
            </AttachmentCard>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Field label="Title" required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief summary of the issue" />
        </Field>
        <Field label="Description" required>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="What happened? What did you expect?"
          />
        </Field>
        <Field label="Severity" required>
          <Select value={severity} onChange={(e) => setSeverity(e.target.value as BugReportSeverity)}>
            {(Object.keys(BUG_REPORT_SEVERITY_LABELS) as BugReportSeverity[]).map((s) => (
              <option key={s} value={s}>
                {BUG_REPORT_SEVERITY_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      </div>
    </Modal>
  );
}

export type { FormState as BugReportFormState };
