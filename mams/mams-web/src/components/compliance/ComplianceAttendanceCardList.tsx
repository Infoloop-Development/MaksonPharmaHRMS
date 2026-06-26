import type { ComplianceAttendanceRow } from '../../api/complianceAttendance';
import { fmtDate } from '../../lib/format';
import { useTimeDisplay } from '../../store/timeFormat';
import { AttendanceStatusPill, ComplianceShiftPill } from './complianceAttendanceUi';

export function ComplianceAttendanceCardList({
  items,
  isLoading,
  emptyMessage = 'No attendance records yet. Use Generate or wait for nightly autogen at 00:00 IST.',
  onEditRow,
}: {
  items: ComplianceAttendanceRow[] | undefined;
  isLoading: boolean;
  emptyMessage?: string;
  onEditRow?: (row: ComplianceAttendanceRow) => void;
}) {
  const { fmtTime } = useTimeDisplay();

  if (isLoading) {
    return <div className="card p-6 text-center text-text-muted text-sm md:hidden">Loading…</div>;
  }
  if (!items?.length) {
    return (
      <div className="card p-6 text-center text-text-muted text-sm md:hidden">{emptyMessage}</div>
    );
  }

  return (
    <div className="space-y-2 md:hidden">
      {items.map((row) => (
        <div key={row._id} className="card p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="font-semibold text-text">{row.employeeId?.name ?? '—'}</div>
              <div className="font-mono text-xs text-text-muted">
                {row.employeeId?.empCode ?? '—'}
                {row.employeeId?.department ? ` · ${row.employeeId.department}` : ''}
              </div>
            </div>
            <AttendanceStatusPill status={row.status} />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <ComplianceShiftPill shift={row.alternateShift} />
            <span className="text-xs text-text-muted font-mono">{fmtDate(row.date)}</span>
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            <div>
              <dt className="text-text-subtle uppercase tracking-wider">Clock-in</dt>
              <dd className="font-mono dash-time">{fmtTime(row.checkInAt)}</dd>
            </div>
            <div>
              <dt className="text-text-subtle uppercase tracking-wider">Clock-out</dt>
              <dd className="font-mono dash-time">
                {fmtTime(row.checkOutAt)}
                {row.checkOutNextDay ? ' (+1)' : ''}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-text-subtle uppercase tracking-wider">Hours</dt>
              <dd className="font-mono dash-time">{row.hoursWorked.toFixed(2)}</dd>
            </div>
          </dl>
          {onEditRow && (
            <button type="button" className="btn-outline btn-sm mt-3 w-full" onClick={() => onEditRow(row)}>
              Edit
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
