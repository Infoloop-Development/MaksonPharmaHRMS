import type { MonthlyPlanDay } from '../../lib/monthlyCompliancePlanner';

const STATUS_STYLES: Record<
  MonthlyPlanDay['status'],
  { bg: string; text: string; label: string }
> = {
  present: { bg: 'bg-green/15 border-green/40', text: 'text-green', label: 'Present' },
  leave: { bg: 'bg-amber/15 border-amber/40', text: 'text-amber', label: 'Leave' },
  weeklyOff: { bg: 'bg-surface2 border-border', text: 'text-text-muted', label: 'Weekly Off' },
  unassigned: { bg: 'bg-surface border-border/60', text: 'text-text-subtle', label: '—' },
  empty: { bg: 'bg-transparent border-transparent', text: 'text-transparent', label: '' },
};

const WEEK_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ComplianceMonthCalendar({ weeks }: { weeks: MonthlyPlanDay[][] }) {
  return (
    <div>
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
                return <div key={ci} className="min-h-[72px] rounded-md" aria-hidden />;
              }
              return (
                <div
                  key={cell.date}
                  className={`min-h-[72px] rounded-md border p-1.5 text-xs ${style.bg}`}
                  title={
                    cell.status === 'present' && cell.clockIn
                      ? `${cell.clockIn} – ${cell.clockOut}${cell.clockOutNextDay ? ' (+1)' : ''}`
                      : undefined
                  }
                >
                  <div className="font-semibold text-text">{cell.dayOfMonth}</div>
                  <div className={`font-medium mt-0.5 ${style.text}`}>{style.label}</div>
                  {cell.status === 'present' && cell.clockIn && (
                    <div className="font-mono text-[10px] text-text-muted mt-1 leading-tight">
                      {cell.clockIn}
                      <br />
                      {cell.clockOut}
                      {cell.clockOutNextDay ? ' +1' : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mt-4 text-xs text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green/30 border border-green/40" /> Present
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber/30 border border-amber/40" /> Leave
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-surface2 border border-border" /> Weekly Off
        </span>
      </div>
    </div>
  );
}
