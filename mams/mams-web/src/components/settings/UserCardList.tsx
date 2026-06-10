import { Badge } from '../ui/Badge';
import type { UserSummary } from '../../api/users';

export function UserCardList({
  items,
  isLoading,
  sessionUserId,
  onEdit,
}: {
  items: UserSummary[];
  isLoading: boolean;
  sessionUserId?: string;
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
            <div>
              <div className="font-semibold">{u.name}</div>
              <div className="text-xs text-text-muted break-all">{u.email}</div>
            </div>
            <Badge tone={u.isActive ? 'green' : 'red'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
          </div>
          <div className="flex items-center justify-between gap-2 mt-3">
            <Badge tone="blue">{u.role}</Badge>
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
