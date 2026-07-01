import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import type { BugReportSeverity } from '@mams/types';
import { BUG_REPORT_SEVERITY_LABELS } from '@mams/types';
import { Modal } from '../ui/Modal';
import { Field, Input, Select, Textarea } from '../ui/Field';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../store/auth';
import { bugReportsApi } from '../../api/bugReports';
import {
  buildBugReportContext,
  getBreadcrumbsSnapshot,
  getConsoleBufferSnapshot,
  getFailedRequestsSnapshot,
} from '../../lib/bugReport';

export function BugReportModal({
  open,
  onClose,
  screenshotPreview,
}: {
  open: boolean;
  onClose: () => void;
  screenshotPreview: string | null;
}) {
  const user = useAuth((s) => s.user);
  const location = useLocation();
  const toast = useToast((s) => s.push);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<BugReportSeverity>('medium');

  const submitMu = useMutation({
    mutationFn: () =>
      bugReportsApi.submit({
        title: title.trim(),
        description: description.trim(),
        severity,
        screenshotBase64: screenshotPreview ?? undefined,
        consoleLog: getConsoleBufferSnapshot(),
        breadcrumbs: getBreadcrumbsSnapshot(),
        failedRequests: getFailedRequestsSnapshot(),
        context: buildBugReportContext(location.pathname, user?.role ?? 'unknown'),
      }),
    onSuccess: () => {
      toast('Bug report submitted. Thank you.', 'success');
      setTitle('');
      setDescription('');
      setSeverity('medium');
      onClose();
    },
    onError: (e: unknown) => {
      toast(e instanceof Error ? e.message : 'Failed to submit bug report', 'error');
    },
  });

  const canSubmit = title.trim().length >= 3 && description.trim().length >= 10 && !submitMu.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Report a bug"
      size="lg"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose} disabled={submitMu.isPending}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!canSubmit}
            onClick={() => submitMu.mutate()}
          >
            {submitMu.isPending ? 'Submitting…' : 'Submit report'}
          </button>
        </>
      }
    >
      <p className="text-xs text-text-muted mb-4">
        A screenshot of the current page, recent console output, and navigation trail are attached automatically.
        Unmasked sensitive fields may appear if you used Unmask on this page.
      </p>

      {screenshotPreview ? (
        <div className="mb-4">
          <div className="text-xs font-semibold text-text-muted mb-2">Screenshot preview</div>
          <img
            src={`data:image/jpeg;base64,${screenshotPreview}`}
            alt="Bug report screenshot"
            className="max-h-48 w-full object-contain rounded-md border border-border bg-surface2"
          />
        </div>
      ) : (
        <p className="text-xs text-amber mb-4">
          Screenshot could not be captured automatically. Your report will still be submitted with console and navigation context.
        </p>
      )}

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
    </Modal>
  );
}
