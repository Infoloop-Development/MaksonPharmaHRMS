import {
  ALL_SENSITIVE_UNMASK_FIELDS,
  SENSITIVE_UNMASK_FIELD_LABELS,
  type SensitiveUnmaskField,
} from '@mams/types';
import { Toggle } from '../ui/Field';

export function UnmaskFieldGrantsSection({
  grants,
  onChange,
  disabled,
}: {
  grants: SensitiveUnmaskField[];
  onChange: (next: SensitiveUnmaskField[]) => void;
  disabled?: boolean;
}) {
  const setField = (field: SensitiveUnmaskField, on: boolean) => {
    if (disabled) return;
    if (on) {
      if (!grants.includes(field)) onChange([...grants, field]);
    } else {
      onChange(grants.filter((f) => f !== field));
    }
  };

  return (
    <div className="space-y-3 border border-border rounded-lg p-3 bg-surface2/40">
      <div>
        <div className="text-sm font-semibold">Sensitive fields this user can unmask</div>
        <p className="text-xs text-text-muted mt-1 leading-relaxed">
          Turn on only the fields this HR Admin may reveal on employee profiles. Each reveal requires
          their login password and is audit-logged. Leave all off if they should not see unmasked data.
        </p>
      </div>
      <div className="user-unmask-grid">
        {ALL_SENSITIVE_UNMASK_FIELDS.map((field) => (
          <div key={field} className="user-unmask-chip">
            <span className="text-sm font-medium leading-snug">{SENSITIVE_UNMASK_FIELD_LABELS[field]}</span>
            <Toggle
              checked={grants.includes(field)}
              onChange={(v) => setField(field, v)}
              disabled={disabled}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
