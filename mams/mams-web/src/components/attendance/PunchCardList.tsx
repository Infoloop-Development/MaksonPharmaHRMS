import { fmtIstTime, fmtDate } from '../../lib/format';

export interface PunchRow {
  _id: string;
  biometricId: string;
  punchType: 'IN' | 'OUT' | 'OTHER';
  rawTimestamp: string;
  rawDate: string;
  employeeId?: { name: string; empCode: string; department: string } | null;
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
        <div key={p._id} className="card p-4 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold">{p.employeeId?.name ?? '—'}</div>
              <div className="font-mono text-xs text-text-muted">
                {p.employeeId?.empCode ?? '—'} · Bio {p.biometricId}
              </div>
            </div>
            <span
              className={`px-2 py-1 rounded text-[10px] font-semibold shrink-0 ${
                p.punchType === 'IN'
                  ? 'bg-green-bg text-green-dark'
                  : p.punchType === 'OUT'
                    ? 'bg-amber-bg text-amber'
                    : 'bg-surface2 text-text-muted'
              }`}
            >
              {p.punchType}
            </span>
          </div>
          <div className="flex justify-between text-xs text-text-muted">
            <span className="font-mono">{fmtIstTime(p.rawTimestamp)}</span>
            <span>{fmtDate(p.rawDate)}</span>
          </div>
          {p.employeeId?.department && (
            <div className="text-xs text-text-subtle">{p.employeeId.department}</div>
          )}
        </div>
      ))}
    </div>
  );
}
