import { Badge } from '../ui/Badge';
import { EMPTY_CELL, fmtDate } from '../../lib/format';
import { useTimeDisplay } from '../../store/timeFormat';
import type { RegularizationListItem } from '../../api/regularization';
import {
  formatRequestedTimes,
  REGULARIZATION_TYPE_LABELS,
  statusTone,
} from './regularizationUtils';

export function RegularizationRequestCardList({
  items,
  onOpen,
}: {
  items: RegularizationListItem[];
  onOpen: (item: RegularizationListItem) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <RegularizationRequestCard key={item._id} item={item} onOpen={() => onOpen(item)} />
      ))}
    </div>
  );
}

function RegularizationRequestCard({
  item,
  onOpen,
}: {
  item: RegularizationListItem;
  onOpen: () => void;
}) {
  const emp = typeof item.employeeId === 'object' ? item.employeeId : null;
  const initiator = typeof item.initiatedBy === 'object' ? item.initiatedBy : null;
  const decider = typeof item.decidedBy === 'object' ? item.decidedBy : null;
  const { fmtTime, format } = useTimeDisplay();

  return (
    <div className="card p-5 cursor-pointer hover:ring-1 hover:ring-border transition" onClick={onOpen}>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-bold">{emp?.name ?? 'Unknown'}</span>
          <span className="text-xs font-mono text-text-muted">{emp?.empCode}</span>
          <span className="text-xs text-text-muted">·</span>
          <span className="text-xs text-text-muted">{fmtDate(item.date)}</span>
        </div>
        <Badge tone={statusTone(item.status)}>{item.status}</Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-text-subtle">Type</div>
          <div>{REGULARIZATION_TYPE_LABELS[item.type]}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-text-subtle">Requested times</div>
          <div className="font-mono text-xs">
            {formatRequestedTimes(item.type, item.requestedInTime, item.requestedOutTime, format)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-text-subtle">Reason</div>
          <div className="line-clamp-2">{item.reason}</div>
        </div>
      </div>
      <div className="mt-3 text-xs text-text-muted">
        Initiated by <span className="font-semibold">{initiator?.name ?? EMPTY_CELL}</span> at {fmtTime(item.initiatedAt)}
        {decider && (
          <>
            {' · '}
            {item.status === 'Approved' ? 'Approved' : 'Rejected'} by{' '}
            <span className="font-semibold">{decider.name}</span> at {fmtTime(item.decidedAt!)}
          </>
        )}
      </div>
    </div>
  );
}
