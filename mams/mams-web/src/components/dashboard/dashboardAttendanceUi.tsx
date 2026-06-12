import { useTimeDisplay } from '../../store/timeFormat';

export function AttendanceStatusPill({ status }: { status: string }) {
  if (status === 'Present') return <span className="dash-pill-green">Present</span>;
  if (status === 'Late') return <span className="dash-pill-amber">Late</span>;
  if (status === 'Absent') return <span className="dash-pill-red">Absent</span>;
  return <span className="dash-pill bg-surface2 text-text-muted">{status}</span>;
}

export function AttendanceShiftPill({ shift }: { shift: 'Day' | 'Night' }) {
  return (
    <span className={shift === 'Day' ? 'dash-pill-blue' : 'dash-pill-amber'}>{shift}</span>
  );
}

export function useDisplayAttendanceCell() {
  const { fmtStamp } = useTimeDisplay();
  return (value: string | null | undefined): string => {
    if (value == null || value === '' || value === '-') return '-';
    return fmtStamp(value);
  };
}
