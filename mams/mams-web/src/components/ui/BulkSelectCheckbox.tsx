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
      className="h-4 w-4 shrink-0 rounded border-border bg-surface2 text-primary accent-primary focus:ring-2 focus:ring-primary/30 focus:ring-offset-0 dark:border-text-subtle dark:bg-surface"
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
