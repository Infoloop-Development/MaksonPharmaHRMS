import { Badge } from '../ui/Badge';
import type { LeaveTypeItem } from '../../api/leave';

export function LeaveTypeCardList({
  items,
  canManage,
  onEdit,
}: {
  items: LeaveTypeItem[];
  canManage: boolean;
  onEdit: (t: LeaveTypeItem) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="card p-6 text-center text-text-muted text-sm md:hidden border border-border rounded-md">
        No leave types. Seed defaults to get started.
      </div>
    );
  }

  return (
    <div className="space-y-3 md:hidden">
      {items.map((t) => (
        <div key={t.id} className="border border-border rounded-md p-4 bg-white">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="font-semibold">{t.name}</div>
            <Badge tone={t.active ? 'green' : 'gray'}>{t.active ? 'Active' : 'Inactive'}</Badge>
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <div>
              <dt className="text-text-subtle uppercase tracking-wider">Paid</dt>
              <dd>{t.paid ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt className="text-text-subtle uppercase tracking-wider">Half day</dt>
              <dd>{t.halfDayEligible ? 'Yes' : 'No'}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-text-subtle uppercase tracking-wider">Default quota</dt>
              <dd className="font-mono">{t.annualQuotaDefault} days</dd>
            </div>
          </dl>
          {canManage && (
            <button type="button" className="btn-outline btn-sm w-full mt-3 min-h-[44px]" onClick={() => onEdit(t)}>
              Edit
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
