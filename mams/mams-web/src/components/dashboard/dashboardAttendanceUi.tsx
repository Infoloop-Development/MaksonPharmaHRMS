import { useTimeDisplay } from '../../store/timeFormat';

export function AttendanceStatusPill({ status }: { status: string }) {
  if (status === 'Present') return <span className="dash-pill-green">Present</span>;
  if (status === 'Late') return <span className="dash-pill-amber">Late</span>;
  if (status === 'Absent') return <span className="dash-pill-red">Absent</span>;
  return <span className="dash-pill bg-surface2 text-text-muted">{status}</span>;
}

// Compliance shift colors match the stat tile accents in ComplianceAttendancePanel (A=green, B=amber, C=red).
const COMPLIANCE_SHIFT_LABELS: Record<'A' | 'B' | 'C', string> = {
  A: 'Morning',
  B: 'Afternoon',
  C: 'Night',
};

export function AttendanceShiftPill({ shift }: { shift: string }) {
  if (shift === 'Day') return <span className="dash-pill-shift-blue">Day</span>;
  if (shift === 'Night') return <span className="dash-pill-shift-amber">Night</span>;
  if (shift === 'A') return <span className="dash-pill-shift-green">{COMPLIANCE_SHIFT_LABELS.A}</span>;
  if (shift === 'B') return <span className="dash-pill-shift-amber">{COMPLIANCE_SHIFT_LABELS.B}</span>;
  if (shift === 'C') return <span className="dash-pill-shift-red">{COMPLIANCE_SHIFT_LABELS.C}</span>;
  return <span className="dash-pill-shift-blue">Shift {shift}</span>;
}

export function useDisplayAttendanceCell() {
  const { fmtStamp } = useTimeDisplay();
  return (value: string | null | undefined): string => {
    if (value == null || value === '' || value === '-') return '-';
    return fmtStamp(value);
  };
}
