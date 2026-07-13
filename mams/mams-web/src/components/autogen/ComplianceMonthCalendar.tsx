import type { MonthlyPlanDay } from '../../lib/monthlyCompliancePlanner';
import { formatCheckOutLabel } from '../../lib/monthlyCompliancePlanner';
import { Badge } from '../ui/Badge';
import { EMPTY_CELL } from '../../lib/format';

const STATUS_STYLES: Record<
  MonthlyPlanDay['status'],
  { cell: string; badge: 'green' | 'amber' | 'gray' | 'blue' }
> = {
  present: {
    cell: 'bg-green-bg/60 border-green/30 hover:bg-green-bg/80',
    badge: 'green',
  },
  leave: {
    cell: 'bg-amber-bg/60 border-amber/30 hover:bg-amber-bg/80',
    badge: 'amber',
  },
  weeklyOff: {
    cell: 'bg-surface2 border-border',
    badge: 'gray',
  },
  unassigned: {
    cell: 'bg-surface border-border/70',
    badge: 'gray',
  },
  empty: {
    cell: 'bg-transparent border-transparent',
    badge: 'gray',
  },
};

const STATUS_LABELS: Record<MonthlyPlanDay['status'], string> = {
  present: 'Present',
  leave: 'Leave',
  weeklyOff: 'Weekly Off',
  unassigned: EMPTY_CELL,
  empty: '',
};

const WEEK_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function cellAriaLabel(cell: MonthlyPlanDay): string | undefined {
  if (!cell.inMonth) return undefined;
  const parts = [`${cell.date}, ${STATUS_LABELS[cell.status]}`];
  if (cell.involvedPerson) parts.push(`Involved: ${cell.involvedPerson}`);
  if (cell.status === 'present' && cell.checkIn && cell.checkOut) {
    parts.push(`Check in ${cell.checkIn}`);
    parts.push(`Check out ${formatCheckOutLabel(cell.checkOut, cell.checkOutNextDay)}`);
    if (cell.hoursWorkedFormatted) parts.push(cell.hoursWorkedFormatted);
  }
  return parts.join('. ');
}

export function ComplianceMonthCalendar({ weeks }: { weeks: MonthlyPlanDay[][] }) {
  return (
    <div className="text-text">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEK_HEADERS.map((h) => (
          <div key={h} className="text-center text-xs font-semibold text-text-muted py-1">
            {h}
          </div>
        ))}
      </div>
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((cell, ci) => {
              const style = STATUS_STYLES[cell.status];
              if (!cell.inMonth) {
                return <div key={ci} className="min-h-[88px] rounded-md" aria-hidden />;
              }

              const label = STATUS_LABELS[cell.status];
              const showPunches = cell.status === 'present' && cell.checkIn && cell.checkOut;

              return (
                <div
                  key={cell.date}
                  className={`min-h-[88px] rounded-md border p-1.5 text-xs transition-colors ${style.cell}`}
                  aria-label={cellAriaLabel(cell)}
                  title={cellAriaLabel(cell)}
                >
                  <div className="flex items-start justify-between gap-0.5">
                    <span className="font-semibold text-text tabular-nums">{cell.dayOfMonth}</span>
                    {label ? <Badge tone={style.badge}>{label}</Badge> : null}
                  </div>

                  {cell.involvedPerson && (
                    <div className="mt-1 text-[10px] font-medium text-text truncate" title={cell.involvedPerson}>
                      {cell.involvedPerson}
                    </div>
                  )}

                  {showPunches && (
                    <dl className="mt-1.5 space-y-0.5 font-mono text-[10px] leading-tight text-text-muted">
                      <div className="flex gap-1">
                        <dt className="text-text-subtle shrink-0">In</dt>
                        <dd className="text-text truncate">{cell.checkIn}</dd>
                      </div>
                      <div className="flex gap-1">
                        <dt className="text-text-subtle shrink-0">Out</dt>
                        <dd className="text-text truncate">
                          {formatCheckOutLabel(cell.checkOut!, cell.checkOutNextDay)}
                        </dd>
                      </div>
                      {cell.hoursWorkedFormatted && (
                        <div className="flex gap-1 pt-0.5 border-t border-border/50">
                          <dt className="text-text-subtle shrink-0">Hrs</dt>
                          <dd className="text-primary-on-bg font-semibold">{cell.hoursWorkedFormatted}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mt-4 text-xs text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-bg border border-green/40" /> Present
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-bg border border-amber/40" /> Leave
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-surface2 border border-border" /> Weekly Off
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-surface border border-border/70" /> Unassigned
        </span>
      </div>
      <p className="mt-2 text-[11px] text-text-subtle">
        Times are <span className="font-mono">HH:mm:ss</span> (24-hour). Hours are decimal. Hover a day for full
        details including who was involved.
      </p>
    </div>
  );
}
