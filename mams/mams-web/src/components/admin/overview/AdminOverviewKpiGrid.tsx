import { useState } from 'react';
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
import type { AdminOverviewKpiMetricId, Permission } from '@mams/types';
import { DashboardStatCard } from '../../ui/DashboardStatCard';
import {
  type AdminKpiValues,
  type AdminOverviewKpiFilterState,
  applyAdminMetricClick,
  getAdminMetricAccent,
  getAdminMetricLabel,
  getAdminMetricSub,
  getAdminMetricTooltip,
  getAdminMetricValue,
  isAdminMetricSelected,
} from '../../../lib/adminOverviewKpiRegistry';
import { AdminOverviewKpiMetricPicker } from './AdminOverviewKpiMetricPicker';

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
  values,
  filterState,
  isEditing,
  isFirstSlot,
  onCardClick,
  onPickMetric,
}: {
  metricId: AdminOverviewKpiMetricId;
  values: AdminKpiValues;
  filterState: AdminOverviewKpiFilterState;
  isEditing: boolean;
  isFirstSlot?: boolean;
  onCardClick: () => void;
  onPickMetric: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: metricId,
    disabled: !isEditing,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`dash-kpi-slot relative h-full ${isEditing ? 'dash-kpi-slot--editing' : ''} ${isDragging ? 'z-10 opacity-90' : ''}`}
    >
      {isEditing && (
        <button
          type="button"
          className="dash-kpi-drag-handle dash-drag-handle"
          aria-label="Drag to reorder"
          data-tour-id={isFirstSlot ? 'admin-kpi-drag-handle' : undefined}
          {...attributes}
          {...listeners}
        >
          <DragHandleIcon />
        </button>
      )}
      <DashboardStatCard
        label={getAdminMetricLabel(metricId, values)}
        value={getAdminMetricValue(metricId, values)}
        sub={getAdminMetricSub(metricId, values)}
        accent={getAdminMetricAccent(metricId, values)}
        selected={isAdminMetricSelected(metricId, filterState)}
        onClick={isEditing ? onPickMetric : onCardClick}
        tooltip={
          isEditing
            ? 'Tap to choose a different metric for this slot.'
            : getAdminMetricTooltip(metricId)
        }
      />
    </div>
  );
}

export function AdminOverviewKpiGrid({
  slots,
  values,
  filterState,
  permissions,
  isEditing,
  onSlotsChange,
  onFilterChange,
  onCancelEdit,
  onSave,
  canSave,
  isSaving,
  pickerSlot: controlledPickerSlot,
  onPickerSlotChange,
}: {
  slots: AdminOverviewKpiMetricId[];
  values: AdminKpiValues;
  filterState: AdminOverviewKpiFilterState;
  permissions: Permission[];
  isEditing: boolean;
  onSlotsChange: (slots: AdminOverviewKpiMetricId[]) => void;
  onFilterChange: (next: AdminOverviewKpiFilterState) => void;
  onCancelEdit: () => void;
  onSave: () => void;
  canSave: boolean;
  isSaving: boolean;
  pickerSlot?: number | null;
  onPickerSlotChange?: (slot: number | null) => void;
}) {
  const [internalPickerSlot, setInternalPickerSlot] = useState<number | null>(null);
  const pickerSlot = controlledPickerSlot !== undefined ? controlledPickerSlot : internalPickerSlot;
  const setPickerSlot = onPickerSlotChange ?? setInternalPickerSlot;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = slots.indexOf(active.id as AdminOverviewKpiMetricId);
    const newIndex = slots.indexOf(over.id as AdminOverviewKpiMetricId);
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
            values={values}
            filterState={filterState}
            isEditing={isEditing}
            isFirstSlot={index === 0}
            onCardClick={() => onFilterChange(applyAdminMetricClick(metricId, filterState))}
            onPickMetric={() => setPickerSlot(slots.indexOf(metricId))}
          />
        ))}
      </SortableContext>
    </div>
  );

  return (
    <div data-tour-id="admin-overview-kpi-grid">
      {isEditing && (
        <>
          <div
            className="dash-kpi-toolbar flex flex-col sm:flex-row flex-wrap justify-end gap-2 mb-2"
            data-tour-id="admin-overview-kpi-edit-toolbar"
          >
            <button type="button" className="btn-outline btn-sm" onClick={onCancelEdit}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={onSave}
              disabled={!canSave || isSaving}
            >
              {isSaving ? 'Saving…' : 'Save KPIs'}
            </button>
          </div>
          <p
            className="dash-kpi-edit-hint text-xs text-text-muted mb-2 md:mb-3"
            data-tour-id="admin-overview-kpi-edit-hint"
          >
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
        <AdminOverviewKpiMetricPicker
          slotIndex={pickerSlot}
          currentSlots={slots}
          permissions={permissions}
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
