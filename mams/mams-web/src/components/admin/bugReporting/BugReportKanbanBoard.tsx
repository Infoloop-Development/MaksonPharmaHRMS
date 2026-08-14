import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { BugPhase } from './useBugReportingBoard';
import type { BugReportListItem, BugReportListResponse } from '@mams/types';
import type { BugShareVariant } from '../../../lib/bugReport/bugShareUrl';
import { BugReportKanbanCard } from './BugReportKanbanCard';

type ColumnData = {
  phaseId: string;
  label: string;
  items: BugReportListItem[];
  total: number;
  isLoading: boolean;
};

function KanbanColumn({
  column,
  onOpen,
  expanded,
  shareVariant,
}: {
  column: ColumnData;
  onOpen: (id: string, publicId?: string) => void;
  expanded: boolean;
  shareVariant: BugShareVariant;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.phaseId });

  return (
    <div
      className={`flex flex-1 flex-col ${
        expanded
          ? 'min-w-0 w-full md:min-w-[280px] max-w-none'
          : 'min-w-0 w-full md:min-w-[260px] md:max-w-[320px]'
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <h2 className="text-sm font-semibold">{column.label}</h2>
        <span className="rounded-full bg-surface2 px-2 py-0.5 text-xs text-text-muted">
          {column.isLoading ? '…' : column.total}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2 rounded-xl border p-2 transition-colors ${
          expanded ? 'min-h-0 max-h-full overflow-y-auto' : 'min-h-[200px]'
        } ${isOver ? 'border-primary/50 bg-primary/5' : 'border-border bg-surface2/30'}`}
      >
        {column.isLoading && (
          <p className="px-2 py-4 text-center text-xs text-text-muted">Loading…</p>
        )}
        {!column.isLoading && column.items.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-text-muted">No reports</p>
        )}
        {!column.isLoading &&
          column.items.map((item) => (
            <BugReportKanbanCard
              key={item.id}
              item={item}
              onOpen={onOpen}
              shareVariant={shareVariant}
            />
          ))}
        {!column.isLoading && column.total > column.items.length && (
          <p className="px-2 py-1 text-center text-[10px] text-text-muted">
            +{column.total - column.items.length} more
          </p>
        )}
      </div>
    </div>
  );
}

type Props = {
  phases: BugPhase[];
  columns: Record<string, BugReportListResponse | undefined>;
  loadingByPhaseId: Record<string, boolean>;
  onOpen: (id: string, publicId?: string) => void;
  onMove: (reportId: string, fromPhaseId: string, toPhaseId: string, phaseLabel: string) => void;
  expanded?: boolean;
  shareVariant?: BugShareVariant;
};

export function BugReportKanbanBoard({
  phases,
  columns,
  loadingByPhaseId,
  onOpen,
  onMove,
  expanded = false,
  shareVariant = 'default',
}: Props) {
  const [activeItem, setActiveItem] = useState<BugReportListItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const phaseLabelById = useMemo(
    () => new Map(phases.map((p) => [p.id, p.label])),
    [phases]
  );

  const columnData = useMemo<ColumnData[]>(
    () =>
      phases.map((phase) => ({
        phaseId: phase.id,
        label: phase.label,
        items: columns[phase.id]?.items ?? [],
        total: columns[phase.id]?.total ?? 0,
        isLoading: loadingByPhaseId[phase.id] ?? false,
      })),
    [phases, columns, loadingByPhaseId]
  );

  const onDragStart = (event: DragStartEvent) => {
    const item = event.active.data.current?.item as BugReportListItem | undefined;
    if (item) setActiveItem(item);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveItem(null);
    const reportId = String(event.active.id);
    const fromPhaseId = event.active.data.current?.phaseId as string | undefined;
    const overId = event.over?.id;
    if (!fromPhaseId || !overId) return;
    const toPhaseId = String(overId);
    if (fromPhaseId === toPhaseId) return;
    const phaseLabel = phaseLabelById.get(toPhaseId) ?? '';
    onMove(reportId, fromPhaseId, toPhaseId, phaseLabel);
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div
        className={`scrollbar-hidden flex flex-col md:flex-row gap-3 overflow-x-auto pb-2 ${
          expanded ? 'flex-1 min-h-0 items-stretch' : 'pb-4'
        }`}
      >
        {columnData.map((column) => (
          <KanbanColumn
            key={column.phaseId}
            column={column}
            onOpen={onOpen}
            expanded={expanded}
            shareVariant={shareVariant}
          />
        ))}
      </div>
      <DragOverlay>
        {activeItem ? (
          <div className="w-[280px] rotate-1 opacity-95">
            <BugReportKanbanCard item={activeItem} onOpen={() => undefined} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
