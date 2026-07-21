import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { VisitorField, VisitorFieldType } from '@mams/types';
import { VISITOR_FIELD_TYPE_LABELS, visitorFieldNeedsOptions } from '@mams/types';
import { Field, Input } from '../ui/Field';

function DragHandle() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="text-text-muted">
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

/** Compact card used in DragOverlay: no sortable hooks. */
export function FormFieldDragGhost({ field }: { field: VisitorField }) {
  return (
    <div className="form-field-drag-overlay card p-3 border-2 border-primary shadow-floating">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
          {VISITOR_FIELD_TYPE_LABELS[field.type]}
        </span>
        <span className="text-sm font-medium truncate">{field.label}</span>
        {field.required && <span className="text-red text-xs shrink-0">Required</span>}
      </div>
    </div>
  );
}

export function FormFieldRow({
  field,
  selected,
  onSelect,
  onChange,
  onRemove,
  rowRef,
}: {
  field: VisitorField;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<VisitorField>) => void;
  onRemove: () => void;
  rowRef?: (el: HTMLDivElement | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
    animateLayoutChanges: () => false,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
  };

  const setRef = (el: HTMLDivElement | null) => {
    setNodeRef(el);
    rowRef?.(el);
  };

  const updateOption = (index: number, value: string) => {
    const opts = [...(field.options ?? [])];
    opts[index] = value;
    onChange({ options: opts });
  };

  const addOption = () => onChange({ options: [...(field.options ?? []), `Option ${(field.options?.length ?? 0) + 1}`] });
  const removeOption = (index: number) => {
    const opts = (field.options ?? []).filter((_, i) => i !== index);
    onChange({ options: opts.length ? opts : ['Option 1'] });
  };

  return (
    <div
      ref={setRef}
      style={style}
      className={`card p-4 mb-0 border-2 transition-colors hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] ${
        selected ? 'border-primary' : 'border-transparent'
      } ${isDragging ? 'form-field-row--dragging' : ''}`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          className="form-drag-handle"
          aria-label="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <DragHandle />
        </button>
        <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
          {VISITOR_FIELD_TYPE_LABELS[field.type]}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          className="btn-outline text-xs shrink-0 text-red"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          Remove
        </button>
      </div>

      {selected && (
        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
          <Field label="Field label">
            <Input value={field.label} onChange={(e) => onChange({ label: e.target.value })} />
          </Field>
          {field.type !== 'file' && field.type !== 'radio' && field.type !== 'checkbox' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Placeholder">
                <Input
                  value={field.placeholder ?? ''}
                  onChange={(e) => onChange({ placeholder: e.target.value || undefined })}
                />
              </Field>
              <Field label="Help text">
                <Input
                  value={field.helpText ?? ''}
                  onChange={(e) => onChange({ helpText: e.target.value || undefined })}
                />
              </Field>
            </div>
          ) : (
            <Field label="Help text">
              <Input
                value={field.helpText ?? ''}
                onChange={(e) => onChange({ helpText: e.target.value || undefined })}
              />
            </Field>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => onChange({ required: e.target.checked })}
            />
            Required
          </label>
          {visitorFieldNeedsOptions(field.type) && (
            <Field label="Options">
              <div className="space-y-2">
                {(field.options ?? []).map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={opt} onChange={(e) => updateOption(i, e.target.value)} />
                    <button type="button" className="btn-outline text-xs shrink-0" onClick={() => removeOption(i)}>
                      ×
                    </button>
                  </div>
                ))}
                <button type="button" className="btn-outline text-xs" onClick={addOption}>
                  Add option
                </button>
              </div>
            </Field>
          )}
        </div>
      )}

      {!selected && (
        <p className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-red ml-1">*</span>}
        </p>
      )}
    </div>
  );
}

export function FormFieldPreview({ field }: { field: VisitorField }) {
  const label = (
    <label className="block text-sm font-medium mb-1">
      {field.label}
      {field.required && <span className="text-red ml-0.5">*</span>}
    </label>
  );
  const help = field.helpText ? <p className="text-xs text-text-muted mb-2">{field.helpText}</p> : null;

  switch (field.type) {
    case 'short_text':
    case 'email':
    case 'phone':
      return (
        <div className="mb-4">
          {label}
          {help}
          <input className="input w-full" placeholder={field.placeholder} disabled />
        </div>
      );
    case 'long_text':
      return (
        <div className="mb-4">
          {label}
          {help}
          <textarea className="input w-full min-h-[80px]" placeholder={field.placeholder} disabled />
        </div>
      );
    case 'date':
      return (
        <div className="mb-4">
          {label}
          {help}
          <input type="date" className="input w-full" disabled />
        </div>
      );
    case 'time':
      return (
        <div className="mb-4">
          {label}
          {help}
          <input type="time" className="input w-full" disabled />
        </div>
      );
    case 'dropdown':
      return (
        <div className="mb-4">
          {label}
          {help}
          <select className="input w-full" disabled>
            <option>{field.placeholder ?? 'Select…'}</option>
            {(field.options ?? []).map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
      );
    case 'radio':
      return (
        <div className="mb-4">
          {label}
          {help}
          <div className="space-y-1">
            {(field.options ?? []).map((o) => (
              <label key={o} className="flex items-center gap-2 text-sm">
                <input type="radio" disabled /> {o}
              </label>
            ))}
          </div>
        </div>
      );
    case 'checkbox':
      return (
        <div className="mb-4">
          {label}
          {help}
          <div className="space-y-1">
            {(field.options ?? []).map((o) => (
              <label key={o} className="flex items-center gap-2 text-sm">
                <input type="checkbox" disabled /> {o}
              </label>
            ))}
          </div>
        </div>
      );
    case 'file':
      return (
        <div className="mb-4">
          {label}
          {help}
          <input type="file" className="input w-full" disabled />
        </div>
      );
    default:
      return null;
  }
}

export const FIELD_TYPE_OPTIONS: { value: VisitorFieldType; label: string }[] = (
  Object.entries(VISITOR_FIELD_TYPE_LABELS) as [VisitorFieldType, string][]
).map(([value, label]) => ({ value, label }));
