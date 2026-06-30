export function BulkSelectCheckbox({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
  disabled,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <input
      type="checkbox"
      className="h-4 w-4 rounded border-border accent-primary"
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = !!indeterminate;
      }}
      onChange={onChange}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => e.stopPropagation()}
    />
  );
}
