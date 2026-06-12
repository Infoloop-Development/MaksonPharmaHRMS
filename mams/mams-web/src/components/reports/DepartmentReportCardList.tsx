import type { DepartmentReport } from '../../api/reports';
import { fmtHours } from '../../lib/format';

export function DepartmentReportCardList({
  rows,
  isLoading,
  emptyMessage = 'No department data for this month.',
}: {
  rows: DepartmentReport['rows'] | undefined;
  isLoading: boolean;
  emptyMessage?: string;
}) {
  if (isLoading) {
    return <div className="card p-6 text-center text-text-muted text-sm md:hidden print:hidden">Loading…</div>;
  }

  if (!rows?.length) {
    return (
      <div className="card p-6 text-center text-text-muted text-sm md:hidden print:hidden">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-2 md:hidden print:hidden max-h-[60vh] overflow-y-auto">
      {rows.map((r) => (
        <div key={r.department} className="card p-4 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="font-semibold break-words">{r.department}</div>
            <span className="text-xs text-text-muted shrink-0">{r.employeeCount} employees</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted">Present</div>
              <div className="font-mono text-xs">{r.presentDays}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted">Absent</div>
              <div className="font-mono text-xs">{r.absentDays}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted">Compliant hrs</div>
              <div className="font-mono text-xs">{fmtHours(r.totalCompliantHours)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted">OT hrs</div>
              <div className="font-mono text-xs">{fmtHours(r.totalOtHours)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-surface2 rounded-full overflow-hidden">
              <div className="h-full bg-green" style={{ width: `${Math.min(100, r.attendanceRate)}%` }} />
            </div>
            <span className="font-mono text-xs shrink-0">{r.attendanceRate.toFixed(0)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}
