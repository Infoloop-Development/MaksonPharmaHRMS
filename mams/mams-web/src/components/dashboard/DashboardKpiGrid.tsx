import { useState } from 'react';
import { useAuth } from '../../store/auth';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DashboardKpiMetricId } from '@mams/types';
import { DashboardStatCard } from '../ui/DashboardStatCard';
import {
  type DashboardKpiFilterState,
  type KpiDayValues,
  applyMetricClick,
  getMetricAccent,
  getMetricLabel,
  getMetricSub,
  getMetricTooltip,
  getMetricValue,
  isMetricSelected,
} from '../../lib/dashboardKpiRegistry';
import { DashboardKpiMetricPicker } from './DashboardKpiMetricPicker';

function DragHandleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

function SortableKpiSlot({
  metricId,
  isFirstSlot,
  values,
  filterState,
  isEditing,
  onCardClick,
  onPickMetric,
}: {
  metricId: DashboardKpiMetricId;
  isFirstSlot?: boolean;
  values: KpiDayValues;
  filterState: DashboardKpiFilterState;
  isEditing: boolean;
  onCardClick: () => void;
  onPickMetric: () => void;
}) {
  const isCompliant = useAuth((s) => s.user?.viewMode === 'compliant');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: metricId,
    disabled: !isEditing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`dash-kpi-slot relative h-full ${isEditing ? 'dash-kpi-slot--editing' : ''} ${isDragging ? 'z-10 opacity-90' : ''}`}
    >
        {isEditing && (
        <button
          type="button"
          className="dash-kpi-drag-handle dash-drag-handle"
          aria-label="Drag to reorder"
          data-tour-id={isFirstSlot ? 'dashboard-kpi-drag-handle' : undefined}
          {...attributes}
          {...listeners}
        >
          <DragHandleIcon />
        </button>
      )}
      <DashboardStatCard
        label={getMetricLabel(metricId, values,isCompliant)}
        value={getMetricValue(metricId, values)}
        sub={getMetricSub(metricId, values)}
        accent={getMetricAccent(metricId)}
        selected={isMetricSelected(metricId, filterState)}
        onClick={isEditing ? onPickMetric : onCardClick}
        tooltip={
          isEditing
            ? 'Tap to choose a different metric for this slot.'
            : getMetricTooltip(metricId)
        }
      />
    </div>
  );
}

export function DashboardKpiGrid({
  slots,
  values,
  filterState,
  isEditing,
  onSlotsChange,
  onFilterChange,
  onCancelEdit,
  onSave,
  canSave,
  isSaving,
}: {
  slots: DashboardKpiMetricId[];
  values: KpiDayValues;
  filterState: DashboardKpiFilterState;
  isEditing: boolean;
  onSlotsChange: (slots: DashboardKpiMetricId[]) => void;
  onFilterChange: (next: DashboardKpiFilterState) => void;
  onCancelEdit: () => void;
  onSave: () => void;
  canSave: boolean;
  isSaving: boolean;
}) {
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = slots.indexOf(active.id as DashboardKpiMetricId);
    const newIndex = slots.indexOf(over.id as DashboardKpiMetricId);
    if (oldIndex < 0 || newIndex < 0) return;
    onSlotsChange(arrayMove(slots, oldIndex, newIndex));
  };

  const grid = (
    <div className={`dash-stat-grid ${isEditing ? 'dash-kpi-grid--editing' : ''}`}>
      <SortableContext items={slots} strategy={rectSortingStrategy}>
        {slots.map((metricId, index) => (
          <SortableKpiSlot
            key={metricId}
            metricId={metricId}
            isFirstSlot={index === 0}
            values={values}
            filterState={filterState}
            isEditing={isEditing}
            onCardClick={() => onFilterChange(applyMetricClick(metricId, filterState))}
            onPickMetric={() => setPickerSlot(index)}
          />
        ))}
      </SortableContext>
    </div>
  );

  return (
    <div data-tour-id="dashboard-kpi-grid">
      {isEditing && (
        <>
          <div className="dash-kpi-toolbar flex flex-col sm:flex-row flex-wrap justify-end gap-2 mb-2" data-tour-id="dashboard-kpi-edit-toolbar">
            <button type="button" className="btn-outline btn-sm dash-kpi-toolbar-btn" onClick={onCancelEdit}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary btn-sm dash-kpi-toolbar-btn"
              onClick={onSave}
              disabled={!canSave || isSaving}
            >
              {isSaving ? 'Saving…' : 'Save KPIs'}
            </button>
          </div>
          <p className="dash-kpi-edit-hint text-xs text-text-muted mb-2 md:mb-3" data-tour-id="dashboard-kpi-edit-hint">
            Drag cards to reorder. Tap a card to change its metric.
          </p>
        </>
      )}

      {isEditing ? (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
          {grid}
        </DndContext>
      ) : (
        grid
      )}

      {pickerSlot !== null && (
        <DashboardKpiMetricPicker
          slotIndex={pickerSlot}
          currentSlots={slots}
          onSelect={(metric) => {
            const next = [...slots];
            next[pickerSlot] = metric;
            onSlotsChange(next);
          }}
          onClose={() => setPickerSlot(null)}
        />
      )}
    </div>
  );
}
