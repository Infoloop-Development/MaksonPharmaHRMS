import type { ActivityListItem } from '@mams/types';
import { fmtIstDateTimeMs } from '../../lib/format';
import { activityPageBadge, formatActivityDescription } from '../../lib/activityLabels';

export function ActivityCardList({
  items,
  isLoading,
  emptyMessage = 'No activity recorded yet.',
}: {
  items: ActivityListItem[] | undefined;
  isLoading: boolean;
  emptyMessage?: string;
}) {
  if (isLoading) {
    return <div className="card p-6 text-center text-text-muted text-sm md:hidden">Loading activity…</div>;
  }

  if (!items?.length) {
    return (
      <div className="card p-6 text-center text-text-muted text-sm md:hidden">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-2 md:hidden max-h-[420px] overflow-y-auto">
      {items.map((row) => (
        <div key={row.id} className="card p-4 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-surface2 text-text-muted shrink-0">
              {activityPageBadge(row.eventType, row.payload)}
            </span>
            <span className="font-mono text-xs text-text-muted text-right break-all">
              {fmtIstDateTimeMs(row.occurredAt)}
            </span>
          </div>
          <p className="text-sm text-text break-words">{formatActivityDescription(row)}</p>
        </div>
      ))}
    </div>
  );
}
