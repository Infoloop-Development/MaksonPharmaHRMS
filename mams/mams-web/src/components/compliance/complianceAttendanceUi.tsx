import type { ComplianceShift } from '@mams/types';

const SHIFT_LABELS: Record<ComplianceShift, string> = {
  A: 'Morning',
  B: 'Afternoon',
  C: 'Night',
};

export { AttendanceStatusPill } from '../dashboard/dashboardAttendanceUi';

// Matches the shift accent colors used by the stat tiles in ComplianceAttendancePanel (A=green, B=amber, C=red).
export function ComplianceShiftPill({ shift }: { shift: ComplianceShift }) {
  const className =
    shift === 'A' ? 'dash-pill-green' : shift === 'B' ? 'dash-pill-amber' : 'dash-pill-red';
  return <span className={className}>{SHIFT_LABELS[shift]}</span>;
}
