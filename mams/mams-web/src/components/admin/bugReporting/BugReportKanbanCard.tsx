import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  BUG_REPORT_SEVERITY_LABELS,
  type BugReportListItem,
  type BugReportSeverity,
} from '@mams/types';
import { Badge } from '../../ui/Badge';
import { fmtIstDate } from '../../../lib/format';

function severityTone(severity: BugReportSeverity): 'green' | 'amber' | 'red' | 'blue' {
  if (severity === 'critical') return 'red';
  if (severity === 'high') return 'amber';
  if (severity === 'medium') return 'blue';
  return 'green';
}

type Props = {
  item: BugReportListItem;
  onOpen: (id: string) => void;
  isDragging?: boolean;
};

export function BugReportKanbanCard({ item, onOpen, isDragging }: Props) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
    data: { phaseId: item.phaseId, item },
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-border bg-surface p-3 shadow-sm touch-manipulation ${
        isDragging ? 'opacity-50 ring-2 ring-primary/40' : 'hover:border-primary/30'
      }`}
    >
      <button type="button" className="w-full text-left" onClick={() => onOpen(item.id)}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-snug line-clamp-2">{item.title}</h3>
          <div className="flex shrink-0 items-center gap-1 text-text-muted" aria-hidden>
            {item.hasVideo && (
              <span title="Has video" className="text-[10px]">
                ▶
              </span>
            )}
            {item.hasAttachments && (
              <span title="Has attachments" className="text-[10px]">
                📎
              </span>
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge tone={severityTone(item.severity)}>{BUG_REPORT_SEVERITY_LABELS[item.severity]}</Badge>
        </div>
        <p className="mt-2 text-xs text-text-muted truncate">{item.module}</p>
        <p className="mt-0.5 text-xs text-text-muted truncate">{item.reporter.name}</p>
        {item.assignee && (
          <p className="mt-1 text-xs text-text truncate">Assigned: {item.assignee.name}</p>
        )}
        {item.deadline && (
          <p className="mt-0.5 text-xs text-amber">Due {fmtIstDate(item.deadline)}</p>
        )}
      </button>
      <button
        type="button"
        className="mt-2 w-full cursor-grab active:cursor-grabbing rounded border border-dashed border-border/80 py-1 text-[10px] uppercase tracking-wide text-text-muted hover:bg-surface2/60"
        aria-label={`Drag ${item.title}`}
        {...attributes}
        {...listeners}
      >
        Drag to move
      </button>
    </div>
  );
}
