import type { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DashboardBlockId } from '@mams/types';
import { DASHBOARD_BLOCK_LABELS } from '../../lib/dashboardLayout';

function DragHandleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

export function DashboardLayoutBlock({
  id,
  isEditing,
  children,
}: {
  id: DashboardBlockId;
  isEditing: boolean;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !isEditing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!isEditing) {
    return <div className="h-full">{children}</div>;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`dash-layout-block dash-layout-block--editing h-full flex flex-col ${isDragging ? 'dash-layout-block--dragging' : ''}`}
    >
      <div className="dash-layout-block-toolbar">
        <button
          type="button"
          className="dash-drag-handle"
          aria-label={`Drag ${DASHBOARD_BLOCK_LABELS[id]}`}
          {...attributes}
          {...listeners}
        >
          <DragHandleIcon />
        </button>
        <span className="dash-layout-block-label">
          {DASHBOARD_BLOCK_LABELS[id]}
          {id === 'table' && <span className="text-text-subtle font-normal normal-case"> (full width)</span>}
        </span>
      </div>
      <div className="dash-layout-block-content flex-1 opacity-60 pointer-events-none">{children}</div>
    </div>
  );
}
