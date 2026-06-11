import { fmtDate } from '../../lib/format';
import type { HolidayRow } from './HolidayFormModal';

type HolidayItem = {
  id: string;
  name: string;
  date: string;
  type: string;
  departments: string[];
  locations: string[];
};

export function LeaveHolidayCardList({
  items,
  isLoading,
  canConfigure,
  onEdit,
  onDelete,
}: {
  items: HolidayItem[];
  isLoading: boolean;
  canConfigure: boolean;
  onEdit: (h: HolidayRow) => void;
  onDelete: (id: string) => void;
}) {
  if (isLoading) {
    return <div className="card p-6 text-center text-text-muted text-sm md:hidden">Loading…</div>;
  }
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 md:hidden mb-4">
      {items.map((h) => (
        <div key={h.id} className="card p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="font-semibold">{h.name}</div>
              <div className="text-sm text-text-muted">{fmtDate(h.date)}</div>
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded bg-surface2 border border-border">{h.type}</span>
          </div>
          <p className="text-xs text-text-muted mb-3">
            {h.departments.length || h.locations.length
              ? `${h.departments.join(', ') || 'All depts'} / ${h.locations.join(', ') || 'All locs'}`
              : 'All employees'}
          </p>
          {canConfigure && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-outline btn-sm" onClick={() => onEdit(h)}>Edit</button>
              <button type="button" className="btn-outline btn-sm text-red" onClick={() => onDelete(h.id)}>Delete</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
