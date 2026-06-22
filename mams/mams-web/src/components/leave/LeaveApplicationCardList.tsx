import { Badge } from '../ui/Badge';
import type { LeaveApplicationItem } from '../../api/leave';
import { fmtDate } from '../../lib/format';
import { employeeInitials, leaveTypeLabel, leaveStatusTone } from './leaveUtils';

export function LeaveApplicationCardList({
  items,
  isLoading,
  canApply,
  canApprove,
  onView,
  onApprove,
  onReject,
  onAddLeave,
}: {
  items: LeaveApplicationItem[];
  isLoading: boolean;
  canApply: boolean;
  canApprove: boolean;
  onView: (item: LeaveApplicationItem) => void;
  onApprove: (item: LeaveApplicationItem) => void;
  onReject: (item: LeaveApplicationItem) => void;
  onAddLeave: () => void;
}) {
  if (isLoading) {
    return <div className="card p-6 text-center text-text-muted text-sm md:hidden">Loading…</div>;
  }
  if (items.length === 0) {
    return (
      <div className="card p-6 text-center text-text-muted text-sm md:hidden">
        No leave applications match your filters.
        {canApply && (
          <>
            {' '}
            <button type="button" className="text-primary underline" onClick={onAddLeave}>Add leave</button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 md:hidden">
      {items.map((row) => {
        const emp = row.employeeId;
        return (
          <div key={row._id} className="card p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-full bg-primary-bg text-primary-on-bg text-xs font-bold flex items-center justify-center shrink-0">
                  {emp?.name ? employeeInitials(emp.name) : '?'}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold truncate">{emp?.name ?? '—'}</div>
                  <div className="font-mono text-xs text-text-muted">{emp?.empCode}</div>
                </div>
              </div>
              <Badge tone={leaveStatusTone(row.status)}>{row.status}</Badge>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs mb-3">
              <div className="col-span-2">
                <dt className="text-text-subtle uppercase tracking-wider">Type</dt>
                <dd>{leaveTypeLabel(row)}</dd>
              </div>
              <div>
                <dt className="text-text-subtle uppercase tracking-wider">Dates</dt>
                <dd>
                  {fmtDate(row.fromDate)}
                  {row.fromDate !== row.toDate && <> — {fmtDate(row.toDate)}</>}
                </dd>
              </div>
              <div>
                <dt className="text-text-subtle uppercase tracking-wider">Days</dt>
                <dd className="font-mono">{row.totalDays}</dd>
              </div>
              {row.reason && (
                <div className="col-span-2">
                  <dt className="text-text-subtle uppercase tracking-wider">Reason</dt>
                  <dd className="line-clamp-2">{row.reason}</dd>
                </div>
              )}
            </dl>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-outline btn-sm" onClick={() => onView(row)}>View</button>
              {canApprove && row.status === 'Pending' && (
                <>
                  <button type="button" className="btn-primary btn-sm" onClick={() => onApprove(row)}>Approve</button>
                  <button type="button" className="btn-outline btn-sm text-red" onClick={() => onReject(row)}>Reject</button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
