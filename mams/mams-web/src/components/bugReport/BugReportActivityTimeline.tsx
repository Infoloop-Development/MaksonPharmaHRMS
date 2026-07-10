import { buildBugActivityTimeline } from '@mams/types';
import type { BugReportDetail } from '@mams/types';
import { Badge } from '../ui/Badge';
import { fmtIstDate } from '../../lib/format';

type Props = {
  detail: BugReportDetail;
};

function entryTone(type: 'raised' | 'status' | 'assignment'): 'blue' | 'green' | 'amber' {
  if (type === 'raised') return 'green';
  if (type === 'status') return 'blue';
  return 'amber';
}

export function BugReportActivityTimeline({ detail }: Props) {
  const entries = buildBugActivityTimeline(detail);

  return (
    <div className="card p-4">
      <h2 className="font-semibold text-sm mb-3">Activity timeline</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-text-muted">No activity recorded yet.</p>
      ) : (
        <ol className="space-y-3">
          {entries.map((entry, index) => (
            <li key={`${entry.type}-${entry.timestamp}-${index}`} className="flex gap-3">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary/70" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={entryTone(entry.type)}>{entry.label}</Badge>
                  <span className="text-xs text-text-muted">{fmtIstDate(entry.timestamp)}</span>
                </div>
                <p className="mt-1 text-sm text-text">{entry.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
