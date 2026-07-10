import { buildBugActivityTimeline, formatTimelineLine } from '@mams/types';
import type { BugReportDetail } from '@mams/types';
import { fmtIstDate } from '../format';

export { buildBugActivityTimeline, formatTimelineLine };

export function formatBugActivityTimelineText(detail: BugReportDetail): string {
  return buildBugActivityTimeline(detail)
    .map((entry) => `${entry.timestamp} — ${formatTimelineLine(entry)}`)
    .join('\n');
}
