import { useMemo, useState } from 'react';
import { complianceAttendanceApi } from '../../api/complianceAttendance';
import { Modal } from '../ui/Modal';
import { Field, Input } from '../ui/Field';
import { useToast } from '../ui/Toast';
import { useReportJob } from '../../hooks/useReportJob';

function defaultYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function FinancialReportModal({
  onClose,
  initialYearMonth,
}: {
  onClose: () => void;
  initialYearMonth?: string;
}) {
  const toast = useToast((s) => s.push);
  const { isPolling, error: jobError, statusLabel, startJob } = useReportJob();
  const [yearMonth, setYearMonth] = useState(initialYearMonth ?? defaultYearMonth());
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const submitting = isPolling;

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) errors.push('Choose a valid month');
    return errors;
  }, [yearMonth]);

  const onSubmit = async () => {
    setSubmitAttempted(true);
    if (validationErrors.length > 0) {
      toast(validationErrors[0]!, 'error');
      return;
    }
    try {
      const fallback = `financial-report-${yearMonth}.xlsx`;
      await startJob(
        () => complianceAttendanceApi.createFinancialReportJob({ yearMonth }),
        fallback
      );
      toast('Report ready — download started', 'success');
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Export failed', 'error');
    }
  };

  return (
    <Modal
      open
      title="Download financial report"
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" disabled={submitting} onClick={() => void onSubmit()}>
            {submitting ? statusLabel || 'Generating…' : 'Generate report'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Month" required>
          <Input type="month" value={yearMonth} onChange={(e) => setYearMonth(e.target.value)} />
        </Field>

        <p className="text-xs text-text-muted">
          Includes all active employees. Compliance hours come from generated attendance (capped at 208).
          Real hours come from biometric attendance logs. Cheque payment is min(real, 208); cash is max(0, real −
          208).
        </p>

        {submitAttempted && validationErrors.length > 0 && (
          <div className="p-3 rounded-md bg-red/10 border border-red/30 text-sm text-red">
            {validationErrors[0]}
          </div>
        )}

        {(submitting || jobError) && (
          <div
            className={`p-3 rounded-md text-sm border ${
              jobError
                ? 'bg-red/10 border-red/30 text-red'
                : 'bg-primary-bg border-primary/30 text-primary-on-bg'
            }`}
          >
            {jobError ?? statusLabel ?? 'Starting report job…'}
          </div>
        )}
      </div>
    </Modal>
  );
}
