import { BULK_SELECTION_MAX } from '@mams/types';

export function BulkActionBar({
  count,
  overLimit,
  actionLabel,
  onAction,
  onClear,
  disabled,
}: {
  count: number;
  overLimit?: boolean;
  actionLabel: string;
  onAction: () => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  if (count === 0) return null;

  return (
    <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
      <span className="font-medium">
        {count.toLocaleString()} selected
        {overLimit && (
          <span className="ml-2 text-red font-normal">
            (max {BULK_SELECTION_MAX} — deselect some items)
          </span>
        )}
      </span>
      <div className="flex flex-wrap gap-2 ml-auto">
        <button type="button" className="btn-outline btn-sm" onClick={onClear}>
          Clear selection
        </button>
        <button
          type="button"
          className="btn-primary btn-sm bg-red hover:bg-red/90"
          onClick={onAction}
          disabled={disabled || overLimit}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
