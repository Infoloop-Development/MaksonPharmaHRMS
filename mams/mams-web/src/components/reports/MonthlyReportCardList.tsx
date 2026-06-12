import type { MonthlyReport } from '../../api/reports';
import { fmtHours } from '../../lib/format';

export function MonthlyReportCardList({
  rows,
  isLoading,
  isCompliant,
  emptyMessage = 'No records for this month.',
}: {
  rows: MonthlyReport['rows'] | undefined;
  isLoading: boolean;
  isCompliant: boolean;
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
        <div key={r.employeeId} className="card p-4 flex flex-col gap-2">
          <div>
            <div className="font-semibold break-words">{r.name}</div>
            <div className="font-mono text-xs text-text-muted">{r.empCode}</div>
          </div>
          <div className="text-xs text-text-muted break-words">
            {r.department}
            {r.location ? ` · ${r.location}` : ''}
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
              <div className="text-[10px] uppercase tracking-wider text-text-muted">Weekly off</div>
              <div className="font-mono text-xs">{r.weeklyOffDays}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted">Total hrs</div>
              <div className="font-mono text-xs">
                {fmtHours(isCompliant ? r.totalCompliantHours : r.totalRealNetHours)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted">OT</div>
              <div className="font-mono text-xs">{fmtHours(r.totalOtHours)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted">Equiv. days</div>
              <div className="font-mono text-xs">{r.equivalentDays?.toFixed(1) ?? '—'}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
