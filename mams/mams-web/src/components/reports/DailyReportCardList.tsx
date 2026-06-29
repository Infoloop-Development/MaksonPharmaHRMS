import { Badge } from '../ui/Badge';
import { EMPTY_CELL, fmtDate, fmtHours } from '../../lib/format';
import { useTimeDisplay } from '../../store/timeFormat';

type DailyRow = Record<string, any>;

function statusTone(status: string): 'green' | 'red' | 'gray' {
  if (status === 'Present') return 'green';
  if (status === 'Absent') return 'red';
  return 'gray';
}

export function DailyReportCardList({
  rows,
  isLoading,
  isCompliant,
  emptyMessage = 'No records for this date range.',
}: {
  rows: DailyRow[] | undefined;
  isLoading: boolean;
  isCompliant: boolean;
  emptyMessage?: string;
}) {
  const { fmtTime } = useTimeDisplay();

  if (isLoading) {
    return (
      <div className="card p-6 text-center text-text-muted text-sm md:hidden print:hidden">Loading…</div>
    );
  }

  if (!rows?.length) {
    return (
      <div className="card p-6 text-center text-text-muted text-sm md:hidden print:hidden">
        {emptyMessage}
      </div>
    );
  }

  const displayRows = rows.slice(0, 500);
  const hoursLabel = isCompliant ? 'Hours' : 'Net Hrs';

  return (
    <div className="space-y-2 md:hidden print:hidden max-h-[60vh] overflow-y-auto">
      {displayRows.map((r, i) => {
        const emp = r.employeeId;
        const entry = isCompliant ? r.compliantEntryAt : r.realEntryAt;
        const exit = isCompliant ? r.compliantExitAt : r.realExitAt;
        const hrs = isCompliant ? r.compliantHours : r.realNetHours;

        return (
          <div key={i} className="card p-4 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold break-words">{emp?.name ?? EMPTY_CELL}</div>
                <div className="font-mono text-xs text-text-muted">
                  {emp?.empCode ?? EMPTY_CELL} · {fmtDate(r.date)}
                </div>
              </div>
              <span className="shrink-0">
                <Badge tone={statusTone(r.status)}>{r.status}</Badge>
              </span>
            </div>
            <div className={`grid gap-2 text-sm ${isCompliant ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-muted">Entry</div>
                <div className="font-mono text-xs">{entry ? fmtTime(entry) : EMPTY_CELL}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-muted">Exit</div>
                <div className="font-mono text-xs">{exit ? fmtTime(exit) : EMPTY_CELL}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-muted">{hoursLabel}</div>
                <div className="font-mono text-xs">{typeof hrs === 'number' ? fmtHours(hrs) : EMPTY_CELL}</div>
              </div>
              {!isCompliant && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-text-muted">OT</div>
                  <div className="font-mono text-xs">{r.otHours ? fmtHours(r.otHours) : EMPTY_CELL}</div>
                </div>
              )}
            </div>
            <div className="text-xs text-text-muted break-words">
              {emp?.department ?? EMPTY_CELL}
              {emp?.location ? ` · ${emp.location}` : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}
