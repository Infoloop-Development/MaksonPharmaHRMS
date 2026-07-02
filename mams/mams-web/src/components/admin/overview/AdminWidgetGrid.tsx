import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { AdminOverviewAnalyticsPayload, AdminOverviewWidget, Permission } from '@mams/types';
import { ADMIN_OVERVIEW_WIDGET_MAX } from '@mams/types';
import { AdminChartWidget } from './charts/AdminChartWidget';

function SortableWidget({
  widget,
  analytics,
  isLoading,
  selectedDayIndex,
  onDayClick,
  isEditing,
  isFirstWidget,
  onEdit,
  onRemove,
}: {
  widget: AdminOverviewWidget;
  analytics: AdminOverviewAnalyticsPayload | undefined;
  isLoading: boolean;
  selectedDayIndex: number;
  onDayClick: (index: number) => void;
  isEditing: boolean;
  isFirstWidget?: boolean;
  onEdit: () => void;
  onRemove?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
    disabled: !isEditing,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`h-full ${isDragging ? 'z-10 opacity-90' : ''}`}
    >
      {isEditing && (
        <button
          type="button"
          className="dash-kpi-drag-handle dash-drag-handle mb-1"
          aria-label="Drag to reorder"
          data-tour-id={isFirstWidget ? 'admin-chart-drag-handle' : undefined}
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
      )}
      <AdminChartWidget
        widget={widget}
        analytics={analytics}
        isLoading={isLoading}
        selectedDayIndex={selectedDayIndex}
        onDayClick={onDayClick}
        isEditing={isEditing}
        onEdit={onEdit}
        onRemove={onRemove}
        tourAnchorId={
          isEditing && isFirstWidget
            ? 'admin-overview-chart-edit-card'
            : !isEditing && isFirstWidget
              ? 'admin-overview-first-chart'
              : undefined
        }
      />
    </div>
  );
}

function AddChartTile({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="dash-chart-card min-h-[var(--dash-chart-card-min-h)] flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border hover:border-primary hover:bg-primary-bg/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
      aria-label="Add chart"
    >
      <span className="text-3xl text-primary">+</span>
      <span className="text-sm font-semibold text-primary">Add chart</span>
      <span className="text-xs text-text-muted text-center">Up to {ADMIN_OVERVIEW_WIDGET_MAX} charts (4 rows)</span>
    </button>
  );
}

export function AdminWidgetGrid({
  widgets,
  analytics,
  isLoading,
  selectedDayIndex,
  onDayClick,
  isEditing,
  onWidgetsChange,
  onEditWidget,
  onAddChart,
  permissions: _permissions,
}: {
  widgets: AdminOverviewWidget[];
  analytics: AdminOverviewAnalyticsPayload | undefined;
  isLoading: boolean;
  selectedDayIndex: number;
  onDayClick: (index: number) => void;
  isEditing: boolean;
  onWidgetsChange: (widgets: AdminOverviewWidget[]) => void;
  onEditWidget: (index: number) => void;
  onAddChart: () => void;
  permissions: Permission[];
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = widgets.findIndex((w) => w.id === active.id);
    const newIndex = widgets.findIndex((w) => w.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onWidgetsChange(arrayMove(widgets, oldIndex, newIndex));
  };

  const canAdd = isEditing && widgets.length < ADMIN_OVERVIEW_WIDGET_MAX;

  const grid = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 card-grid-stretch" data-tour-id="admin-overview-chart-grid">
      {widgets.map((widget, index) => (
        <SortableWidget
          key={widget.id}
          widget={widget}
          analytics={analytics}
          isLoading={isLoading}
          selectedDayIndex={selectedDayIndex}
          onDayClick={onDayClick}
          isEditing={isEditing}
          isFirstWidget={index === 0}
          onEdit={() => onEditWidget(index)}
          onRemove={
            widgets.length > 2
              ? () => onWidgetsChange(widgets.filter((_, i) => i !== index))
              : undefined
          }
        />
      ))}
      {canAdd && <AddChartTile onClick={onAddChart} />}
    </div>
  );

  if (!isEditing) return grid;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
        {grid}
      </SortableContext>
    </DndContext>
  );
}

export { ADMIN_OVERVIEW_WIDGET_MAX };
