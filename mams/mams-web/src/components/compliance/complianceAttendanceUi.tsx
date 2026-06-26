import type { ComplianceShift } from '@mams/types';

const SHIFT_LABELS: Record<ComplianceShift, string> = {
  A: 'Morning',
  B: 'Afternoon',
  C: 'Night',
};

export { AttendanceStatusPill } from '../dashboard/dashboardAttendanceUi';

export function ComplianceShiftPill({ shift }: { shift: ComplianceShift }) {
  const className =
    shift === 'A'
      ? 'dash-pill-blue'
      : shift === 'B'
        ? 'dash-pill-amber'
        : 'dash-pill bg-surface2 text-text-muted';
  return <span className={className}>{SHIFT_LABELS[shift]}</span>;
}
