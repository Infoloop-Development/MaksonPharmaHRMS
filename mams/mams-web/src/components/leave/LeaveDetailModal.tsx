import { useQuery } from '@tanstack/react-query';
import type { LeaveStatus } from '@mams/types';
import { leaveApi } from '../../api/leave';
import { Modal } from '../ui/Modal';
import { EMPTY_CELL, fmtDate } from '../../lib/format';
import { leaveTypeLabel, leaveStatusTone } from './leaveUtils';

const PILL_STYLES: Record<LeaveStatus, string> = {
  Pending:   'bg-amber text-white',
  Approved:  'bg-green text-white',
  Rejected:  'border border-red text-red',
  Cancelled: 'border border-border text-text-muted',
};

function StatusPill({ status }: { status: LeaveStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${PILL_STYLES[status]}`}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      {status}
    </span>
  );
}

export function LeaveDetailModal({
  applicationId,
  canApprove,
  onClose,
  onApprove,
  onReject,
}: {
  applicationId: string;
  canApprove?: boolean;
  onClose: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['leave', 'application', applicationId],
    queryFn: () => leaveApi.getApplication(applicationId),
  });

  const ledger = (data?.ledger ?? []) as Array<{
    delta: number;
    balanceAfter: number;
    reason: string;
    occurredAt: string;
  }>;

  const showActions = canApprove && data?.status === 'Pending' && onApprove && onReject;

  const footer = showActions ? (
    <>
      <button type="button" className="btn-outline" onClick={onReject}>Reject</button>
      <button type="button" className="btn-primary" onClick={onApprove}>Approve</button>
    </>
  ) : undefined;

  return (
    <Modal open title="Leave application detail" onClose={onClose} size="md" footer={footer}>
      {isLoading && <p className="text-sm text-text-muted py-4">Loading…</p>}
      {isError && <p className="text-sm text-red py-4">Could not load leave details.</p>}
      {data && (
        <div className="text-sm space-y-6">

          {/* Status pill — sits slightly above the first grid, left-aligned */}
          <div style={{ marginTop: '-6px', marginLeft: '-2px' }}>
            <StatusPill status={data.status} />
          </div>

          {/* Employee + Leave type */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1">Employee</div>
              <div className="font-medium">{data.employeeId?.name ?? EMPTY_CELL}</div>
              <div className="font-mono text-xs text-text-muted mt-0.5">{data.employeeId?.empCode}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1">Leave type</div>
              <div className="font-medium">{leaveTypeLabel(data)}</div>
            </div>
          </div>

          {/* Dates + Total days */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1">Dates</div>
              <div className="font-medium">
                {fmtDate(data.fromDate)}
                {data.fromDate !== data.toDate && <> to {fmtDate(data.toDate)}</>}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1">Total days</div>
              <div className="font-medium">{data.totalDays} {data.totalDays === 1 ? 'day' : 'days'}</div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <div className="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-2">Reason</div>
            <div className="border border-border rounded-lg p-3 bg-surface2 text-text leading-relaxed min-h-[48px]">
              {data.reason}
            </div>
          </div>

          {/* Approver note */}
          {data.approverNote && (
            <div>
              <div className="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-2">Approver note</div>
              <div className="border border-border rounded-lg p-3 bg-surface2 text-text-muted leading-relaxed">
                {data.approverNote}
              </div>
            </div>
          )}

          {/* Excluded holidays */}
          {data.excludedHolidayDates && data.excludedHolidayDates.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-2">Excluded holidays</div>
              <div className="flex flex-wrap gap-1.5">
                {data.excludedHolidayDates.map((d) => (
                  <span key={d} className="px-2 py-0.5 rounded-md bg-surface2 text-text-muted text-xs font-mono border border-border">
                    {fmtDate(d)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quota ledger */}
          {ledger.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-2">Quota ledger</div>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-surface2 text-left text-text-subtle">
                      <th className="px-4 py-3 font-semibold uppercase tracking-wide">Delta</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wide">Balance</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wide">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {ledger.map((row, i) => (
                      <tr key={i} className="hover:bg-surface2/50">
                        <td className="px-4 py-3 font-mono font-semibold">
                          <span className={row.delta > 0 ? 'text-green-on-bg' : 'text-red'}>
                            {row.delta > 0 ? `+${row.delta}` : row.delta}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono">{row.balanceAfter}</td>
                        <td className="px-4 py-3 text-text-muted">{row.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
    </Modal>
  );
}
