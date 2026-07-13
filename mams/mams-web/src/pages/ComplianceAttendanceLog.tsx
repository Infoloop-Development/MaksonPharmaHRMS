import { useState } from 'react';
import { fmtNumber } from '../lib/format';
import { ComplianceAttendancePanel } from '../components/compliance/ComplianceAttendancePanel';
import { ComplianceReportModal } from '../components/compliance/ComplianceReportModal';

export function ComplianceAttendanceLog() {
  const [reportOpen, setReportOpen] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const isLoading = total === null;

  const headerActions = (
    <button type="button" className="btn-primary btn-sm shrink-0" onClick={() => setReportOpen(true)}>
      Generate report
    </button>
  );

  const mobileReportButton = (
    <button type="button" className="btn-primary btn-sm shrink-0" onClick={() => setReportOpen(true)}>
      Report
    </button>
  );

  return (
    <div>
      <div className="mb-3 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Attendance Log</h1>
          <div className="text-sm text-text-muted">
            {isLoading
              ? 'Loading attendance records…'
              : `${fmtNumber(total)} record${total === 1 ? '' : 's'}`}
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {headerActions}
        </div>
      </div>

      <ComplianceAttendancePanel
        mode="readonly"
        showGenerateActions
        showStatsScopeHint
        headerActions={mobileReportButton}
        onTotalChange={setTotal}
      />

      {reportOpen && (
        <ComplianceReportModal onClose={() => setReportOpen(false)} />
      )}
    </div>
  );
}
