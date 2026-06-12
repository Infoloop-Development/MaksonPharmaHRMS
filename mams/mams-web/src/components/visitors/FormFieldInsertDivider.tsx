import type { VisitorFieldType } from '@mams/types';
import { FIELD_TYPE_OPTIONS } from './FormFieldRow';

export function FormFieldInsertDivider({
  afterIndex,
  isOpen,
  onToggle,
  onInsert,
  prominent = false,
}: {
  afterIndex: number;
  isOpen: boolean;
  onToggle: () => void;
  onInsert: (type: VisitorFieldType) => void;
  prominent?: boolean;
}) {
  return (
    <div className={`form-field-insert-divider ${prominent ? 'form-field-insert-divider--prominent' : ''}`}>
      <div className="form-field-insert-divider-line" aria-hidden />
      <button
        type="button"
        className="form-field-insert-btn"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`field-type-picker-${afterIndex}`}
      >
        + Add field
      </button>
      <div className="form-field-insert-divider-line" aria-hidden />

      {isOpen && (
        <div
          id={`field-type-picker-${afterIndex}`}
          className="form-field-type-picker"
          role="listbox"
          aria-label="Choose field type"
        >
          {FIELD_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              className="form-field-type-chip"
              onClick={() => onInsert(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
