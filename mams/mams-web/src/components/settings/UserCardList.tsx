import { Badge } from '../ui/Badge';
import { Toggle } from '../ui/Field';
import { BulkSelectCheckbox } from '../ui/BulkSelectCheckbox';
import type { UserSummary } from '../../api/users';

export function UserCardList({
  items,
  isLoading,
  sessionUserId,
  selectable = false,
  isSelected,
  onToggleSelect,
  togglingUserId,
  onToggleActive,
  onEdit,
}: {
  items: UserSummary[];
  isLoading: boolean;
  sessionUserId?: string;
  selectable?: boolean;
  isSelected?: (id: string) => boolean;
  onToggleSelect?: (id: string) => void;
  togglingUserId?: string | null;
  onToggleActive?: (user: UserSummary, next: boolean) => void;
  onEdit: (u: UserSummary) => void;
}) {
  if (isLoading) {
    return <div className="card p-6 text-center text-text-muted text-sm md:hidden">Loading...</div>;
  }
  if (items.length === 0) {
    return <div className="card p-6 text-center text-text-muted text-sm md:hidden">No users found.</div>;
  }

  return (
    <div className="space-y-3 md:hidden">
      {items.map((u) => (
        <div key={u._id} className="card p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-start gap-3 min-w-0">
              {selectable && isSelected && onToggleSelect && (
                <BulkSelectCheckbox
                  checked={isSelected(u._id)}
                  onChange={() => onToggleSelect(u._id)}
                  ariaLabel={`Select ${u.name}`}
                />
              )}
              <div className="min-w-0">
                <div className="font-semibold">{u.name}</div>
                <div className="text-xs text-text-muted break-all">{u.email}</div>
              </div>
            </div>
            <Badge tone="blue">{u.role}</Badge>
          </div>
          <div className="flex items-center justify-between gap-2 mt-3">
            <div className="flex items-center gap-2">
              {onToggleActive ? (
                <>
                  <Toggle
                    checked={u.isActive}
                    onChange={(next) => onToggleActive(u, next)}
                    disabled={sessionUserId === u._id || togglingUserId === u._id}
                  />
                  <span className="text-xs text-text-muted">{u.isActive ? 'Active' : 'Inactive'}</span>
                </>
              ) : (
                <Badge tone={u.isActive ? 'green' : 'red'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
              )}
            </div>
            <button
              type="button"
              className="btn-outline text-xs px-3 py-2 min-h-[44px]"
              onClick={() => onEdit(u)}
            >
              {sessionUserId === u._id ? 'Profile' : 'Edit'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
