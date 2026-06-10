import { useQuery } from '@tanstack/react-query';
import { leaveApi } from '../../api/leave';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { fmtDate } from '../../lib/format';
import { leaveTypeLabel, leaveStatusTone } from './leaveUtils';

export function LeaveDetailModal({ applicationId, onClose }: { applicationId: string; onClose: () => void }) {
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

  return (
    <Modal open title="Leave application detail" onClose={onClose} size="md">
      {isLoading && <p className="text-sm text-text-muted py-4">Loading…</p>}
      {isError && <p className="text-sm text-red py-4">Could not load leave details.</p>}
      {data && (
        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-2">
            <Badge tone={leaveStatusTone(data.status)}>{data.status}</Badge>
            <span className="text-text-muted font-mono text-xs">{data._id}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-text-subtle uppercase tracking-wide">Employee</div>
              <div className="font-medium">{data.employeeId?.name ?? '—'}</div>
              <div className="font-mono text-xs text-text-muted">{data.employeeId?.empCode}</div>
            </div>
            <div>
              <div className="text-xs text-text-subtle uppercase tracking-wide">Leave type</div>
              <div>{leaveTypeLabel(data)}</div>
            </div>
            <div>
              <div className="text-xs text-text-subtle uppercase tracking-wide">Dates</div>
              <div>{fmtDate(data.fromDate)} — {fmtDate(data.toDate)}</div>
            </div>
            <div>
              <div className="text-xs text-text-subtle uppercase tracking-wide">Total days</div>
              <div className="font-mono font-semibold">{data.totalDays}</div>
            </div>
          </div>

          <div>
            <div className="text-xs text-text-subtle uppercase tracking-wide mb-1">Reason</div>
            <p className="text-text bg-surface2 p-3 rounded-md border border-border">{data.reason}</p>
          </div>

          {data.approverNote && (
            <div>
              <div className="text-xs text-text-subtle uppercase tracking-wide mb-1">Approver note</div>
              <p className="text-text-muted">{data.approverNote}</p>
            </div>
          )}

          {data.excludedHolidayDates && data.excludedHolidayDates.length > 0 && (
            <div>
              <div className="text-xs text-text-subtle uppercase tracking-wide mb-1">Excluded holidays</div>
              <p className="text-text-muted">{data.excludedHolidayDates.map((d) => fmtDate(d)).join(', ')}</p>
            </div>
          )}

          {ledger.length > 0 && (
            <div>
              <div className="text-xs text-text-subtle uppercase tracking-wide mb-2">Quota ledger</div>
              <div className="border border-border rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-surface2 text-left">
                      <th className="px-3 py-2">Delta</th>
                      <th className="px-3 py-2">Balance</th>
                      <th className="px-3 py-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((row, i) => (
                      <tr key={i} className="border-t border-border/60">
                        <td className="px-3 py-2 font-mono">{row.delta > 0 ? `+${row.delta}` : row.delta}</td>
                        <td className="px-3 py-2 font-mono">{row.balanceAfter}</td>
                        <td className="px-3 py-2 text-text-muted">{row.reason}</td>
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
