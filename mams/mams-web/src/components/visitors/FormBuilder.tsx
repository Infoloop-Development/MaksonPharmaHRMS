import { useCallback, useMemo, useRef, useState } from 'react';
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
import { useMutation, useQuery } from '@tanstack/react-query';
import type { VisitorField, VisitorFieldType, VisitorFormLocale, VisitorIntro, VisitorSlugStrategy } from '@mams/types';
import {
  VISITOR_INTRO_IMAGE_FIELD_ID,
  VISITOR_INTRO_VIDEO_FIELD_ID,
  VISITOR_FORM_LOCALE_LABELS,
  applyVisitorFormLayout,
  buildVisitorFormLayout,
  nextVisitorFormLayoutOrder,
  normalizeVisitorLanguages,
  type VisitorMultilingual,
} from '@mams/types';
import { visitorsApi, type VisitorFormItem } from '../../api/visitors';
import { settingsApi } from '../../api/settings';
import { brandingFromSettings } from '../../lib/companyBranding';
import { useToast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { Field, Input, Textarea } from '../ui/Field';
import { FormFieldRow, FormFieldPreview, FormFieldDragGhost } from './FormFieldRow';
import { FormFieldInsertDivider } from './FormFieldInsertDivider';
import { FormSaveSuccessModal } from './FormSaveSuccessModal';
import { RegenerateSlugDialog } from './RegenerateSlugDialog';
import { VisitorIntroEditor } from './VisitorIntroEditor';
import { VisitorMultilingualEditor } from './VisitorMultilingualEditor';
import { VisitorFormLayoutPreview } from './VisitorFormLayoutRenderer';
import { VisitorFormPublicHeader } from './VisitorFormPublicHeader';
import { IntroBlockRow, IntroBlockDragGhost } from './IntroBlockRow';
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

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
    staleTime: 60_000,
  });
  const previewBranding = brandingFromSettings(settings);

  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [multilingual, setMultilingual] = useState<VisitorMultilingual>(
    normalizeVisitorLanguages(initial?.multilingual)
  );
  const [previewLocale, setPreviewLocale] = useState<VisitorFormLocale>('en');
  const [intro, setIntro] = useState<VisitorIntro | null>(initial?.intro ?? null);
  const [introImagePreview, setIntroImagePreview] = useState<string | null>(null);
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
  const introEditorRef = useRef<HTMLDivElement>(null);

  const layoutItems = useMemo(() => buildVisitorFormLayout(intro, fields), [intro, fields]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const normalizeForSave = useCallback(() => {
    const ids = buildVisitorFormLayout(intro, fields).map((i) => i.id);
    return applyVisitorFormLayout(ids, intro, fields);
  }, [intro, fields]);

  const saveMu = useMutation({
    mutationFn: async () => {
      const { intro: savedIntro, fields: savedFields } = normalizeForSave();
      if (isEdit && initial) {
        return visitorsApi.updateForm(initial._id, {
          title: title.trim(),
          description: description.trim() || undefined,
          intro: savedIntro === null ? null : savedIntro,
          multilingual: normalizeVisitorLanguages(multilingual),
          fields: savedFields,
          slugStrategy,
        });
      }
      return visitorsApi.createForm({
        title: title.trim(),
        description: description.trim() || undefined,
        intro: savedIntro ?? undefined,
        multilingual: normalizeVisitorLanguages(multilingual),
        fields: savedFields,
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
        toast('Form updated; existing link and QR code unchanged', 'success');
        onClose();
      }
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const scrollToField = useCallback((id: string) => {
    requestAnimationFrame(() => {
      if (id === VISITOR_INTRO_IMAGE_FIELD_ID || id === VISITOR_INTRO_VIDEO_FIELD_ID) {
        introEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
      fieldRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, []);

  const applyLayoutIds = (ids: string[], extraFields?: VisitorField[]) => {
    const applied = applyVisitorFormLayout(ids, intro, extraFields ? [...fields, ...extraFields] : fields);
    setIntro(applied.intro);
    setFields(applied.fields);
  };

  const insertField = (type: VisitorFieldType, afterLayoutIndex: number) => {
    const f = createEmptyField(type, 0) as VisitorField;
    const ids = layoutItems.map((i) => i.id);
    ids.splice(afterLayoutIndex + 1, 0, f.id);
    applyLayoutIds(ids, [f]);
    setSelectedId(f.id);
    setOpenInsertIndex(null);
    scrollToField(f.id);
  };

  const updateField = (id: string, patch: Partial<VisitorField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeField = (id: string) => {
    const nextFields = fields.filter((f) => f.id !== id);
    const ids = buildVisitorFormLayout(intro, nextFields).map((i) => i.id);
    const applied = applyVisitorFormLayout(ids, intro, nextFields);
    setIntro(applied.intro);
    setFields(applied.fields);
    if (selectedId === id) setSelectedId(applied.fields[0]?.id ?? null);
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setOpenInsertIndex(null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const ids = layoutItems.map((i) => i.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    applyLayoutIds(arrayMove(ids, oldIndex, newIndex));
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

  const activeLayoutItem = activeId ? layoutItems.find((i) => i.id === activeId) : null;
  const activeField = activeLayoutItem?.kind === 'field' ? activeLayoutItem.field : null;

  const setFieldRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) fieldRefs.current.set(id, el);
    else fieldRefs.current.delete(id);
  };

  const getNextBlockOrder = () => nextVisitorFormLayoutOrder(intro, fields);

  const previewBundle = useMemo(() => {
    if (previewLocale === 'en') {
      return { title, description, fields, intro };
    }
    const t = initial?.translations?.[previewLocale];
    if (t) {
      return {
        title: t.title,
        description: t.description,
        fields: t.fields,
        intro,
      };
    }
    return { title, description, fields, intro };
  }, [previewLocale, title, description, fields, intro, initial?.translations]);

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
            <VisitorMultilingualEditor value={multilingual} onChange={setMultilingual} />

            <div className="mb-8">
              <Field label="Form title">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Office visitor registration" />
              </Field>
            </div>
            <div className="mb-8">
              <Field label="Description">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional instructions for visitors"
                  rows={2}
                />
              </Field>
            </div>

            <div ref={introEditorRef}>
              <VisitorIntroEditor
                formId={initial?._id}
                value={intro}
                onChange={(v) => setIntro(v ?? null)}
                onImagePreviewChange={setIntroImagePreview}
                nextBlockOrder={getNextBlockOrder}
                multilingual={multilingual}
              />
            </div>

            {isEdit && (
              <div className="mb-8 p-3 rounded-md bg-surface2 space-y-2">
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

            <div className="mb-8">
              <p className="text-sm font-semibold mb-2">Questions & intro placement</p>
              <p className="text-xs text-text-muted">
                Drag header image and intro video between questions to control where they appear on the public form.
              </p>
            </div>

            <div className="mb-8">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragCancel={onDragCancel}
            >
              <SortableContext items={layoutItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-0">
                  {layoutItems.length === 0 ? (
                    <FormFieldInsertDivider
                      afterIndex={-1}
                      isOpen={openInsertIndex === -1}
                      onToggle={() => setOpenInsertIndex(openInsertIndex === -1 ? null : -1)}
                      onInsert={(type) => insertField(type, -1)}
                      prominent
                    />
                  ) : (
                    layoutItems.map((item, index) => (
                      <div key={item.id}>
                        {item.kind === 'intro_image' && (
                          <IntroBlockRow
                            kind="intro_image"
                            intro={intro}
                            selected={selectedId === item.id}
                            onSelect={() => {
                              setSelectedId(item.id);
                              scrollToField(item.id);
                            }}
                          />
                        )}
                        {item.kind === 'intro_video' && (
                          <IntroBlockRow
                            kind="intro_video"
                            intro={intro}
                            selected={selectedId === item.id}
                            onSelect={() => {
                              setSelectedId(item.id);
                              scrollToField(item.id);
                            }}
                          />
                        )}
                        {item.kind === 'field' && (
                          <FormFieldRow
                            field={item.field}
                            selected={selectedId === item.id}
                            onSelect={() => setSelectedId(item.id)}
                            onChange={(patch) => updateField(item.field.id, patch)}
                            onRemove={() => removeField(item.field.id)}
                            rowRef={setFieldRef(item.field.id)}
                          />
                        )}
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
                {activeField ? (
                  <FormFieldDragGhost field={activeField} />
                ) : activeLayoutItem?.kind === 'intro_image' ? (
                  <IntroBlockDragGhost kind="intro_image" />
                ) : activeLayoutItem?.kind === 'intro_video' ? (
                  <IntroBlockDragGhost kind="intro_video" />
                ) : null}
              </DragOverlay>
            </DndContext>
            </div>
          </div>

          <div className="lg:border-l lg:border-border lg:pl-6">
            <p className="text-sm font-semibold mb-3 text-text-muted uppercase tracking-wide">Preview</p>
            <div className="card p-4 bg-surface2/50">
              <VisitorFormPublicHeader
                branding={{
                  companyName: previewBranding.companyName,
                  companyLogo: previewBranding.companyLogo,
                  registeredAddress: previewBranding.registeredAddress,
                }}
              />
              <h3 className="text-lg font-semibold mb-1">{previewBundle.title || 'Untitled form'}</h3>
              {previewBundle.description && (
                <p className="text-sm text-text-muted mb-4">{previewBundle.description}</p>
              )}
              {multilingual.enabled && multilingual.languages.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {multilingual.languages.map((locale) => (
                    <button
                      key={locale}
                      type="button"
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        previewLocale === locale
                          ? 'bg-primary text-white border-primary'
                          : 'bg-surface2 border-border text-text-muted'
                      }`}
                      onClick={() => setPreviewLocale(locale)}
                    >
                      {VISITOR_FORM_LOCALE_LABELS[locale]}
                    </button>
                  ))}
                </div>
              )}
              <VisitorFormLayoutPreview
                intro={previewBundle.intro}
                fields={previewBundle.fields}
                slug={initial?.publicSlug}
                imagePreviewUrl={introImagePreview ?? undefined}
                locale={previewLocale}
              />
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
