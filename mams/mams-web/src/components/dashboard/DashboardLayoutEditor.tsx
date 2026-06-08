import { useMemo, useState, type ReactNode } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { DashboardBlockId, DashboardLayoutRow } from '@mams/types';
import { dragOverLayoutRows, isChartBlock } from '../../lib/dashboardLayout';
import { DashboardLayoutBlock } from './DashboardLayoutBlock';
import { DashboardLayoutGuide } from './DashboardLayoutGuide';

function LayoutRow({
  rowIndex,
  row,
  isEditing,
  renderBlock,
  highlight,
}: {
  rowIndex: number;
  row: DashboardLayoutRow;
  isEditing: boolean;
  renderBlock: (id: DashboardBlockId) => ReactNode;
  highlight: boolean;
}) {
  const solo = row.items.length === 1;

  return (
    <div
      className={`grid grid-cols-1 items-stretch gap-4 md:gap-6 ${solo ? 'lg:grid-cols-1' : 'lg:grid-cols-2'} ${highlight ? 'dash-layout-row--drop-target' : ''}`}
      data-row-index={rowIndex}
    >
      <SortableContext items={row.items} strategy={horizontalListSortingStrategy}>
        {row.items.map((id) => (
          <div key={id} className={`h-full ${solo ? 'lg:col-span-1' : ''}`}>
            <DashboardLayoutBlock id={id} isEditing={isEditing}>
              {renderBlock(id)}
            </DashboardLayoutBlock>
          </div>
        ))}
      </SortableContext>
    </div>
  );
}

export function DashboardLayoutEditor({
  isEditing,
  rows,
  onRowsChange,
  renderBlock,
}: {
  isEditing: boolean;
  rows: DashboardLayoutRow[];
  onRowsChange: (rows: DashboardLayoutRow[]) => void;
  renderBlock: (id: DashboardBlockId) => ReactNode;
}) {
  const [activeId, setActiveId] = useState<DashboardBlockId | null>(null);
  const [dragBlockedMsg, setDragBlockedMsg] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const allBlockIds = useMemo(() => rows.flatMap((r) => r.items), [rows]);

  const tryDrag = (activeBlockId: DashboardBlockId, overBlockId: DashboardBlockId) => {
    const next = dragOverLayoutRows(rows, activeBlockId, overBlockId);
    if (next) {
      setDragBlockedMsg(null);
      onRowsChange(next);
      return true;
    }
    if (activeBlockId === 'table' || overBlockId === 'table') {
      setDragBlockedMsg('Table must stay full width — use presets or drag onto a chart to move top/bottom.');
    } else {
      setDragBlockedMsg('Drag Bar onto Donut (or vice versa) to swap chart order.');
    }
    return false;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as DashboardBlockId);
    setDragBlockedMsg(null);
  };

  const handleDragOver = (_event: DragOverEvent) => {
    setDragBlockedMsg(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const activeBlockId = active.id as DashboardBlockId;
    const overBlockId = over.id as DashboardBlockId;
    if (!allBlockIds.includes(activeBlockId) || !allBlockIds.includes(overBlockId)) return;

    tryDrag(activeBlockId, overBlockId);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setDragBlockedMsg(null);
  };

  const activeRowIndex = activeId ? rows.findIndex((r) => r.items.includes(activeId)) : -1;

  const rowHighlight = (rowIndex: number, row: DashboardLayoutRow): boolean => {
    if (!isEditing || activeId === null) return false;
    if (rowIndex === activeRowIndex) return false;
    if (isChartBlock(activeId) && row.items.includes('bar') && row.items.includes('donut')) {
      return true;
    }
    if (activeId === 'table' || row.items.includes('table')) {
      return row.items.includes('bar') || row.items.includes('donut');
    }
    return false;
  };

  const content = (
    <div className="space-y-4 md:space-y-6">
      {rows.map((row, i) => (
        <LayoutRow
          key={`row-${i}-${row.items.join('-')}`}
          rowIndex={i}
          row={row}
          isEditing={isEditing}
          renderBlock={renderBlock}
          highlight={rowHighlight(i, row)}
        />
      ))}
    </div>
  );

  if (!isEditing) {
    return content;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <DashboardLayoutGuide rows={rows} onRowsChange={onRowsChange} />
      {dragBlockedMsg && <p className="dash-layout-blocked-msg">{dragBlockedMsg}</p>}
      {content}
    </DndContext>
  );
}
