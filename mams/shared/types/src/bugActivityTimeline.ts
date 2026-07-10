import type {
  BugReportAssignmentHistoryEntry,
  BugReportDetail,
  BugReportStatusHistoryEntry,
} from './bugReport.js';

export type BugActivityTimelineEntryType = 'raised' | 'status' | 'assignment';

export type BugActivityTimelineEntry = {
  type: BugActivityTimelineEntryType;
  timestamp: string;
  label: string;
  detail: string;
};

export function buildBugActivityTimeline(detail: {
  createdAt: string;
  reporter: { name: string };
  statusHistory: BugReportStatusHistoryEntry[];
  assignmentHistory: BugReportAssignmentHistoryEntry[];
}): BugActivityTimelineEntry[] {
  const entries: BugActivityTimelineEntry[] = [
    {
      type: 'raised',
      timestamp: detail.createdAt,
      label: 'Bug Raised',
      detail: `Reported by ${detail.reporter.name}`,
    },
    ...detail.statusHistory.map((entry) => ({
      type: 'status' as const,
      timestamp: entry.changedAt,
      label: 'Status Change',
      detail: `Moved to ${entry.phaseName} by ${entry.changedBy.name}`,
    })),
    ...detail.assignmentHistory.map((entry) => ({
      type: 'assignment' as const,
      timestamp: entry.assignedAt,
      label: 'Assignment',
      detail: entry.assignedTo
        ? `Assigned to ${entry.assignedTo.name} by ${entry.assignedBy.name}${
            entry.deadline ? ` (deadline ${entry.deadline})` : ''
          }`
        : `Unassigned by ${entry.assignedBy.name}`,
    })),
  ];

  return entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export function formatTimelineLine(entry: BugActivityTimelineEntry): string {
  return `[${entry.label}] ${entry.detail}`;
}

export function formatBugActivityTimelineText(detail: {
  createdAt: string;
  reporter: { name: string };
  statusHistory: BugReportStatusHistoryEntry[];
  assignmentHistory: BugReportAssignmentHistoryEntry[];
}): string {
  return buildBugActivityTimeline(detail)
    .map((entry) => `${entry.timestamp} — ${formatTimelineLine(entry)}`)
    .join('\n');
}

export function resolveBugResolvedTimestamp(
  detail: BugReportDetail,
  phaseIsResolved: (phaseId: string) => boolean
): string | null {
  for (const entry of detail.statusHistory) {
    if (phaseIsResolved(entry.phaseId)) {
      return entry.changedAt;
    }
  }
  if (detail.phaseId && phaseIsResolved(detail.phaseId)) {
    return detail.updatedAt;
  }
  return null;
}
