import { Link } from 'react-router-dom';
import type { DashboardAttendanceRow } from '@mams/types';
import { fmtHours } from '../../lib/format';
import { AttendanceShiftPill, AttendanceStatusPill, displayAttendanceCell } from './dashboardAttendanceUi';

export function DashboardAttendanceCardList({
  rows,
  isInitialLoad,
  isRefreshing,
}: {
  rows: DashboardAttendanceRow[];
  isInitialLoad: boolean;
  isRefreshing: boolean;
}) {
  if (isInitialLoad) {
    return (
      <div className="px-4 py-8 text-center text-text-subtle text-sm md:hidden">Loading attendance…</div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-text-subtle text-sm md:hidden">
        No attendance records match your filters.
      </div>
    );
  }

  return (
    <div
      className={`space-y-3 px-4 pb-4 md:hidden ${isRefreshing ? 'opacity-60 transition-opacity duration-150' : ''}`}
    >
      {rows.map((row) => (
        <Link
          key={row.employeeId}
          to={`/employees/${row.employeeId}`}
          className="card p-4 block hover:bg-surface2/50 transition"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="font-semibold text-text">{row.employeeName}</div>
              <div className="font-mono text-xs text-text-muted">{row.empCode}</div>
            </div>
            <AttendanceStatusPill status={row.displayStatus} />
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            <div>
              <dt className="text-text-subtle uppercase tracking-wider">Department</dt>
              <dd>{row.department}</dd>
            </div>
            <div>
              <dt className="text-text-subtle uppercase tracking-wider">Shift</dt>
              <dd>
                <AttendanceShiftPill shift={row.timeShift} />
              </dd>
            </div>
            <div>
              <dt className="text-text-subtle uppercase tracking-wider">Entry</dt>
              <dd className="dash-time">{displayAttendanceCell(row.entryStamp)}</dd>
            </div>
            <div>
              <dt className="text-text-subtle uppercase tracking-wider">Exit</dt>
              <dd className="dash-time">{displayAttendanceCell(row.exitStamp)}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-text-subtle uppercase tracking-wider">Hours</dt>
              <dd className="dash-time">
                {row.totalHoursWorked != null ? fmtHours(row.totalHoursWorked) : '-'}
              </dd>
            </div>
          </dl>
        </Link>
      ))}
    </div>
  );
}
