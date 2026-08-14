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
    <label className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 cursor-pointer">
      <input
        type="checkbox"
        className="h-5 w-5 lg:h-4 lg:w-4 shrink-0 rounded border-border bg-surface2 text-primary accent-primary focus:ring-2 focus:ring-primary/30 focus:ring-offset-0 dark:border-text-subtle dark:bg-surface"
        checked={checked}
        ref={(el) => {
          if (el) el.indeterminate = !!indeterminate;
        }}
        onChange={onChange}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={(e) => e.stopPropagation()}
      />
    </label>
  );
}
