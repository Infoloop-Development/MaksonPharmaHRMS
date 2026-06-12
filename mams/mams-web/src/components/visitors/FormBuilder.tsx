import { useCallback, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useMutation } from '@tanstack/react-query';
import type { VisitorField, VisitorFieldType, VisitorSlugStrategy } from '@mams/types';
import { visitorsApi, type VisitorFormItem } from '../../api/visitors';
import { useToast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { Field, Input, Textarea } from '../ui/Field';
import { FormFieldRow, FormFieldPreview, FormFieldDragGhost } from './FormFieldRow';
import { FormFieldInsertDivider } from './FormFieldInsertDivider';
import { FormSaveSuccessModal } from './FormSaveSuccessModal';
import { RegenerateSlugDialog } from './RegenerateSlugDialog';
import { createEmptyField } from './visitorsUtils';

export function FormBuilder({
  initial,
  onClose,
  onSaved,
}: {
  initial?: VisitorFormItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast((s) => s.push);
  const isEdit = Boolean(initial);

  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [fields, setFields] = useState<VisitorField[]>(
    initial?.fields?.length
      ? [...initial.fields].sort((a, b) => a.order - b.order)
      : [createEmptyField('short_text', 0) as VisitorField]
  );
  const [selectedId, setSelectedId] = useState<string | null>(fields[0]?.id ?? null);
  const [slugStrategy, setSlugStrategy] = useState<VisitorSlugStrategy>('keep');
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [successModal, setSuccessModal] = useState<{ title: string; publicUrl: string; slugRegenerated?: boolean } | null>(null);
  const [openInsertIndex, setOpenInsertIndex] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const fieldRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const saveMu = useMutation({
    mutationFn: async () => {
      const normalized = fields.map((f, i) => ({ ...f, order: i }));
      if (isEdit && initial) {
        return visitorsApi.updateForm(initial._id, {
          title: title.trim(),
          description: description.trim() || undefined,
          fields: normalized,
          slugStrategy,
        });
      }
      return visitorsApi.createForm({
        title: title.trim(),
        description: description.trim() || undefined,
        fields: normalized,
        isActive: true,
      });
    },
    onSuccess: (result) => {
      onSaved();
      if (!isEdit || result.slugRegenerated) {
        setSuccessModal({
          title: result.title,
          publicUrl: result.publicUrl,
          slugRegenerated: result.slugRegenerated,
        });
      } else {
        toast('Form updated — existing link and QR code unchanged', 'success');
        onClose();
      }
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const scrollToField = useCallback((id: string) => {
    requestAnimationFrame(() => {
      fieldRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, []);

  const insertField = (type: VisitorFieldType, afterIndex: number) => {
    const f = createEmptyField(type, afterIndex + 1) as VisitorField;
    setFields((prev) => {
      const next = [...prev];
      next.splice(afterIndex + 1, 0, f);
      return next;
    });
    setSelectedId(f.id);
    setOpenInsertIndex(null);
    scrollToField(f.id);
  };

  const updateField = (id: string, patch: Partial<VisitorField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeField = (id: string) => {
    setFields((prev) => {
      const next = prev.filter((f) => f.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id ?? null);
      return next;
    });
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setOpenInsertIndex(null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    setFields((prev) => {
      const oldIndex = prev.findIndex((f) => f.id === active.id);
      const newIndex = prev.findIndex((f) => f.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const onDragCancel = () => setActiveId(null);

  const handleSave = () => {
    if (!title.trim()) {
      toast('Form title is required', 'error');
      return;
    }
    if (fields.some((f) => !f.label.trim())) {
      toast('Every field must have a label', 'error');
      return;
    }
    if (isEdit && slugStrategy === 'regenerate') {
      setShowRegenerateDialog(true);
      return;
    }
    saveMu.mutate();
  };

  const activeField = activeId ? fields.find((f) => f.id === activeId) : null;

  const setFieldRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) fieldRefs.current.set(id, el);
    else fieldRefs.current.delete(id);
  };

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={isEdit ? 'Edit visitor form' : 'Create visitor form'}
        size="xl"
        footer={
          <>
            <button type="button" className="btn-outline" onClick={onClose} disabled={saveMu.isPending}>
              Cancel
            </button>
            <button
              type="button"
              className="btn bg-primary text-white px-4 py-2 rounded-md text-sm font-semibold"
              disabled={saveMu.isPending}
              onClick={handleSave}
            >
              {saveMu.isPending ? 'Saving…' : 'Save form'}
            </button>
          </>
        }
      >
        <div className="grid lg:grid-cols-2 gap-6 max-h-[65vh] overflow-y-auto pr-1">
          <div>
            <Field label="Form title">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Office visitor registration" />
            </Field>
            <div className="mt-3">
              <Field label="Description">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional instructions for visitors"
                  rows={2}
                />
              </Field>
            </div>

            {isEdit && (
              <div className="mt-4 p-3 rounded-md bg-surface2 space-y-2">
                <p className="text-sm font-medium">Public link & QR code</p>
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="slugStrategy"
                    checked={slugStrategy === 'keep'}
                    onChange={() => setSlugStrategy('keep')}
                  />
                  <span>Update existing form (keep current link & QR code)</span>
                </label>
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="slugStrategy"
                    checked={slugStrategy === 'regenerate'}
                    onChange={() => setSlugStrategy('regenerate')}
                  />
                  <span>Generate new public link & QR code</span>
                </label>
              </div>
            )}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragCancel={onDragCancel}
            >
              <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                <div className="mt-4 space-y-0">
                  {fields.length === 0 ? (
                    <FormFieldInsertDivider
                      afterIndex={-1}
                      isOpen={openInsertIndex === -1}
                      onToggle={() => setOpenInsertIndex(openInsertIndex === -1 ? null : -1)}
                      onInsert={(type) => insertField(type, -1)}
                      prominent
                    />
                  ) : (
                    fields.map((f, index) => (
                      <div key={f.id}>
                        <FormFieldRow
                          field={f}
                          selected={selectedId === f.id}
                          onSelect={() => setSelectedId(f.id)}
                          onChange={(patch) => updateField(f.id, patch)}
                          onRemove={() => removeField(f.id)}
                          rowRef={setFieldRef(f.id)}
                        />
                        <FormFieldInsertDivider
                          afterIndex={index}
                          isOpen={openInsertIndex === index}
                          onToggle={() => setOpenInsertIndex(openInsertIndex === index ? null : index)}
                          onInsert={(type) => insertField(type, index)}
                        />
                      </div>
                    ))
                  )}
                </div>
              </SortableContext>

              <DragOverlay dropAnimation={null}>
                {activeField ? <FormFieldDragGhost field={activeField} /> : null}
              </DragOverlay>
            </DndContext>
          </div>

          <div className="lg:border-l lg:border-border lg:pl-6">
            <p className="text-sm font-semibold mb-3 text-text-muted uppercase tracking-wide">Preview</p>
            <div className="card p-4 bg-surface2/50">
              <h3 className="text-lg font-semibold mb-1">{title || 'Untitled form'}</h3>
              {description && <p className="text-sm text-text-muted mb-4">{description}</p>}
              {fields.map((f) => (
                <FormFieldPreview key={f.id} field={f} />
              ))}
              <button type="button" className="btn bg-primary text-white w-full mt-2" disabled>
                Submit
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {showRegenerateDialog && (
        <RegenerateSlugDialog
          onCancel={() => setShowRegenerateDialog(false)}
          onConfirm={() => {
            setShowRegenerateDialog(false);
            saveMu.mutate();
          }}
        />
      )}

      {successModal && (
        <FormSaveSuccessModal
          title={successModal.title}
          publicUrl={successModal.publicUrl}
          slugRegenerated={successModal.slugRegenerated}
          onClose={() => {
            setSuccessModal(null);
            onClose();
          }}
        />
      )}
    </>
  );
}
