import type { BugReportStatus } from '@mams/types';
import { BUG_REPORT_STATUS_LABELS } from '@mams/types';

const TABS: { value: BugReportStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export function BugReportingTabBar({
  status,
  onStatusChange,
}: {
  status: BugReportStatus | 'all';
  onStatusChange: (status: BugReportStatus | 'all') => void;
}) {
  return (
    <div className="card mb-4 overflow-hidden">
      <div
        className="flex gap-0 overflow-x-auto border-b border-border scrollbar-thin"
        role="tablist"
        aria-label="Bug report status filters"
      >
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={status === tab.value}
            className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              status === tab.value
                ? 'tab-link--active border-b-2 -mb-px'
                : 'border-transparent border-b-2 -mb-px text-text-muted hover:text-text hover:bg-surface2'
            }`}
            onClick={() => onStatusChange(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function statusLabel(status: BugReportStatus): string {
  return BUG_REPORT_STATUS_LABELS[status];
}
