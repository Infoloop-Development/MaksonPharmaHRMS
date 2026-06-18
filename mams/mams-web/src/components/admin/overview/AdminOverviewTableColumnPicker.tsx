import type { AdminOverviewTableKind } from '@mams/types';
import { ADMIN_OVERVIEW_TABLE_COLUMNS } from '@mams/types';

export function AdminOverviewTableColumnPicker({
  kind,
  selectedColumns,
  onChange,
  onClose,
}: {
  kind: AdminOverviewTableKind;
  selectedColumns: string[];
  onChange: (columns: string[]) => void;
  onClose: () => void;
}) {
  const columns = ADMIN_OVERVIEW_TABLE_COLUMNS[kind];
  const selected = new Set(selectedColumns);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      if (next.size <= 1) return;
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(columns.filter((c) => next.has(c.id)).map((c) => c.id));
  };

  return (
    <div
      className="dash-kpi-picker-overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        className="dash-kpi-picker-panel card w-full sm:max-w-sm max-h-[min(85vh,520px)] overflow-hidden flex flex-col rounded-t-2xl sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 pb-2 border-b border-border">
          <h2 className="text-sm font-bold">Table columns</h2>
          <p className="text-xs text-text-muted mt-1">Choose visible columns (at least one).</p>
        </div>
        <ul className="overflow-y-auto p-3 space-y-2 flex-1">
          {columns.map((col) => (
            <li key={col.id}>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(col.id)}
                  onChange={() => toggle(col.id)}
                />
                {col.label}
              </label>
            </li>
          ))}
        </ul>
        <div className="p-3 border-t border-border">
          <button type="button" className="btn-primary btn-sm w-full" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
