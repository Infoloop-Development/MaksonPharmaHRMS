import type { ActivityListItem } from '@mams/types';
import { formatActivityDescription, unmaskActivityOutcome } from '../../lib/activityLabels';

export function ActivityDescription({ item }: { item: ActivityListItem }) {
  const outcome = unmaskActivityOutcome(item.eventType);
  return (
    <span className="inline-flex items-start gap-2">
      {outcome !== null && (
        <span
          className={`mt-1.5 inline-block w-2 h-2 rounded-full shrink-0 ${outcome ? 'bg-green' : 'bg-red'}`}
          title={outcome ? 'Unmask succeeded' : 'Unmask failed'}
          aria-hidden
        />
      )}
      <span>{formatActivityDescription(item)}</span>
    </span>
  );
}
