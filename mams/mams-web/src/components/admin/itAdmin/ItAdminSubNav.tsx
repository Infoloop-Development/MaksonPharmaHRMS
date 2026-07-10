import { NavLink } from 'react-router-dom';
import { canManageOrgUsers } from '@mams/types';
import { useAuth } from '../../../store/auth';

const linkClass = (isActive: boolean) =>
  `shrink-0 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
    isActive
      ? 'tab-link--active border-b-2 -mb-px'
      : 'border-transparent border-b-2 -mb-px text-text-muted hover:text-text hover:bg-surface2'
  }`;

export function ItAdminSubNav() {
  const user = useAuth((s) => s.user);
  const showManageItAdmins = canManageOrgUsers(user?.permissions ?? []);

  return (
    <div className="card mb-4 overflow-hidden">
      <div
        className="flex gap-0 overflow-x-auto border-b border-border scrollbar-thin"
        role="tablist"
        aria-label="IT Admin bug reporting navigation"
      >
        <NavLink to="/admin/bug-reporting" end className={({ isActive }) => linkClass(isActive)}>
          Board
        </NavLink>
        <NavLink to="/admin/bug-reporting/settings" className={({ isActive }) => linkClass(isActive)}>
          Phase settings
        </NavLink>
        {showManageItAdmins && (
          <NavLink to="/admin/bug-reporting/it-admins" className={({ isActive }) => linkClass(isActive)}>
            Manage IT Admins
          </NavLink>
        )}
      </div>
    </div>
  );
}
