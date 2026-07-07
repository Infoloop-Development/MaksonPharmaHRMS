import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { canManageBugReports, type BugPhase } from '@mams/types';
import { useAuth } from '../../store/auth';
import { adminBugReportingApi, BUG_PHASES_QUERY_KEY } from '../../api/adminBugReporting';
import { useToast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { ItAdminSubNav } from '../../components/admin/itAdmin/ItAdminSubNav';

function SortablePhaseRow({
  phase,
  onRename,
  onToggleResolved,
  onDelete,
}: {
  phase: BugPhase;
  onRename: (id: string, label: string) => void;
  onToggleResolved: (id: string, isResolvedState: boolean) => void;
  onDelete: (phase: BugPhase) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: phase.id,
  });
  const [label, setLabel] = useState(phase.label);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card p-3 flex flex-wrap items-center gap-3 ${isDragging ? 'opacity-60 ring-2 ring-primary/30' : ''}`}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-text-muted px-1"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <input
        className="input flex-1 min-w-[10rem]"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => {
          if (label.trim() && label !== phase.label) onRename(phase.id, label.trim());
        }}
      />
      <label className="flex items-center gap-2 text-sm whitespace-nowrap">
        <input
          type="checkbox"
          checked={phase.isResolvedState}
          onChange={(e) => onToggleResolved(phase.id, e.target.checked)}
        />
        Resolved state
      </label>
      <span className="text-xs text-text-muted">{phase.reportCount ?? 0} reports</span>
      <button type="button" className="btn-outline btn-sm text-red" onClick={() => onDelete(phase)}>
        Delete
      </button>
    </div>
  );
}

export function AdminBugReportingPhaseSettings() {
  const user = useAuth((s) => s.user);
  const canAccess = canManageBugReports(user?.permissions ?? []);
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();

  const [newLabel, setNewLabel] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<BugPhase | null>(null);
  const [reassignTo, setReassignTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: BUG_PHASES_QUERY_KEY,
    queryFn: () => adminBugReportingApi.phases.list(),
    enabled: canAccess,
  });

  const phases = data?.phases ?? [];

  const invalidate = () => void qc.invalidateQueries({ queryKey: BUG_PHASES_QUERY_KEY });

  const createMu = useMutation({
    mutationFn: () => adminBugReportingApi.phases.create({ label: newLabel.trim() }),
    onSuccess: () => {
      setNewLabel('');
      invalidate();
      toast('Phase created', 'success');
    },
    onError: (e: unknown) => toast(e instanceof Error ? e.message : 'Create failed', 'error'),
  });

  const patchMu = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { label?: string; isResolvedState?: boolean } }) =>
      adminBugReportingApi.phases.patch(id, body),
    onSuccess: invalidate,
    onError: (e: unknown) => toast(e instanceof Error ? e.message : 'Update failed', 'error'),
  });

  const reorderMu = useMutation({
    mutationFn: (phaseIds: string[]) => adminBugReportingApi.phases.reorder({ phaseIds }),
    onSuccess: invalidate,
    onError: (e: unknown) => toast(e instanceof Error ? e.message : 'Reorder failed', 'error'),
  });

  const deleteMu = useMutation({
    mutationFn: ({ id, reassignToPhaseId }: { id: string; reassignToPhaseId?: string }) =>
      adminBugReportingApi.phases.delete(id, reassignToPhaseId),
    onSuccess: () => {
      setDeleteTarget(null);
      setReassignTo('');
      invalidate();
      void qc.invalidateQueries({ queryKey: ['admin', 'bug-reporting'] });
      toast('Phase deleted', 'success');
    },
    onError: (e: unknown) => toast(e instanceof Error ? e.message : 'Delete failed', 'error'),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = phases.findIndex((p) => p.id === active.id);
    const newIndex = phases.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(phases, oldIndex, newIndex);
    qc.setQueryData(BUG_PHASES_QUERY_KEY, { phases: next });
    reorderMu.mutate(next.map((p) => p.id));
  };

  if (!canAccess) return <Navigate to="/admin" replace />;

  const otherPhases = phases.filter((p) => p.id !== deleteTarget?.id);

  return (
    <div>
      <ItAdminSubNav />
      <div className="mb-4">
        <Link to="/admin/bug-reporting" className="text-sm text-link hover:underline">
          ← Back to board
        </Link>
      </div>
      <h1 className="text-xl sm:text-2xl font-bold mb-2">Kanban phase settings</h1>
      <p className="text-sm text-text-muted mb-6">
        Rename, reorder, or remove columns. Deleting a phase with reports requires reassignment.
      </p>

      {isLoading ? (
        <p className="text-text-muted">Loading…</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={phases.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 mb-6">
              {phases.map((phase) => (
                <SortablePhaseRow
                  key={phase.id}
                  phase={phase}
                  onRename={(id, label) => patchMu.mutate({ id, body: { label } })}
                  onToggleResolved={(id, isResolvedState) =>
                    patchMu.mutate({ id, body: { isResolvedState } })
                  }
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="card p-4 flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[12rem]">
          <label className="text-xs font-semibold text-text-muted block mb-1">New phase</label>
          <input
            className="input w-full"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Phase name"
          />
        </div>
        <button
          type="button"
          className="btn"
          disabled={!newLabel.trim() || createMu.isPending}
          onClick={() => createMu.mutate()}
        >
          Add phase
        </button>
      </div>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => {
          setDeleteTarget(null);
          setReassignTo('');
        }}
        title="Delete phase"
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                setDeleteTarget(null);
                setReassignTo('');
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn bg-red text-white"
              disabled={deleteMu.isPending || ((deleteTarget?.reportCount ?? 0) > 0 && !reassignTo)}
              onClick={() => {
                if (!deleteTarget) return;
                deleteMu.mutate({
                  id: deleteTarget.id,
                  reassignToPhaseId: reassignTo || undefined,
                });
              }}
            >
              Delete
            </button>
          </>
        }
      >
        {deleteTarget && (
          <div className="space-y-3 text-sm">
            <p>
              Delete <strong>{deleteTarget.label}</strong>?
            </p>
            {(deleteTarget.reportCount ?? 0) > 0 ? (
              <>
                <p className="text-text-muted">
                  {deleteTarget.reportCount} report(s) must be moved to another phase.
                </p>
                <select
                  className="input w-full"
                  value={reassignTo}
                  onChange={(e) => setReassignTo(e.target.value)}
                >
                  <option value="">Select target phase…</option>
                  {otherPhases.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <p className="text-text-muted">This phase has no reports.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
