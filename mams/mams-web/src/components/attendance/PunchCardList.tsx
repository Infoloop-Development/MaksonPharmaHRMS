import { EMPTY_CELL, fmtDate } from '../../lib/format';
import { useTimeDisplay } from '../../store/timeFormat';

export interface PunchRow {
  _id: string;
  biometricId: string;
  punchType: 'IN' | 'OUT' | 'OTHER';
  rawTimestamp: string;
  rawDate: string;
  employeeId?: { name: string; empCode: string; department: string; timeShift?: 'Day' | 'Night' } | null;
  assignedShift?: 'Day' | 'Night';
  shiftWindowLabel?: string;
  outsideMainShift?: boolean | null;
}

function OutsideShiftBadge({ punch }: { punch: PunchRow }) {
  if (punch.punchType !== 'IN') {
    return <span className="text-text-muted">{EMPTY_CELL}</span>;
  }
  if (punch.outsideMainShift === true) {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-bg text-amber">
        Flagged
      </span>
    );
  }
  if (punch.outsideMainShift === false) {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-bg text-green-on-bg">
        OK
      </span>
    );
  }
  return <span className="text-text-muted">{EMPTY_CELL}</span>;
}

export function PunchCardList({
  items,
  isLoading,
  emptyMessage = 'No punches yet. Run the eSSL simulator (scripts/essl-sim.js) to generate some.',
}: {
  items: PunchRow[] | undefined;
  isLoading: boolean;
  emptyMessage?: string;
}) {
  const { fmtTime } = useTimeDisplay();

  if (isLoading) {
    return <div className="card p-6 text-center text-text-muted text-sm md:hidden">Loading...</div>;
  }
  if (!items?.length) {
    return (
      <div className="card p-6 text-center text-text-muted text-sm md:hidden">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-2 md:hidden">
      {items.map((p) => (
        <div
          key={p._id}
          className={`card p-4 flex flex-col gap-2 ${
            p.punchType === 'IN' && p.outsideMainShift === true ? 'bg-amber-bg/30' : ''
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold text-text">{p.employeeId?.name ?? EMPTY_CELL}</div>
              <div className="font-mono text-xs text-text-muted">
                {p.employeeId?.empCode ?? EMPTY_CELL} · Bio {p.biometricId}
              </div>
            </div>
            <span
              className={`px-2 py-1 rounded text-[10px] font-semibold shrink-0 ${
                p.punchType === 'IN'
                  ? 'bg-green-bg text-green-on-bg'
                  : p.punchType === 'OUT'
                    ? 'bg-amber-bg text-amber'
                    : 'bg-surface2 text-text-muted'
              }`}
            >
              {p.punchType}
            </span>
          </div>
          <div className="flex justify-between text-xs text-text-muted">
            <span className="font-mono">{fmtTime(p.rawTimestamp)}</span>
            <span>{fmtDate(p.rawDate)}</span>
          </div>
          {p.shiftWindowLabel && (
            <div className="text-xs text-text-muted">Shift: {p.shiftWindowLabel}</div>
          )}
          {p.punchType === 'IN' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-text-muted">Outside shift:</span>
              <OutsideShiftBadge punch={p} />
            </div>
          )}
          {p.employeeId?.department && (
            <div className="text-xs text-text-subtle">{p.employeeId.department}</div>
          )}
        </div>
      ))}
    </div>
  );
}
