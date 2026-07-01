import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../store/auth';
import { authApi } from '../../api/auth';
import { ACTIVITY_QUERY_PREFIX } from '../../api/activity';
import { clearFirstLoginSession } from '../../lib/onboarding/session';
import { isAutogenDemoEnabled } from '../../config/featureFlags';
import { NavIcon, CloseIcon, type NavIconName } from '../navIcons';
import { canManageBugReports, canManageRecycleBin, hasOrgAdminLikeAccess } from '@mams/types';

const ADMIN_NAV: { to: string; label: string; icon: NavIconName }[] = [
  { to: '/admin', label: 'Overview', icon: 'dashboard' },
  { to: '/admin/users', label: 'Users & roles', icon: 'employees' },
  { to: '/admin/organization', label: 'Organization', icon: 'settings' },
  { to: '/admin/security', label: 'Security', icon: 'devices' },
  { to: '/admin/audit', label: 'Audit log', icon: 'reports' },
  { to: '/admin/health', label: 'System health', icon: 'attendance' },
  { to: '/admin/feature-flags', label: 'Feature flags', icon: 'autogen' },
];

const HR_NAV: { to: string; label: string; icon: NavIconName }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/employees', label: 'Employees', icon: 'employees' },
  { to: '/attendance', label: 'Attendance Log', icon: 'attendance' },
  { to: '/reports', label: 'Reports', icon: 'reports' },
  { to: '/adjustments', label: 'Adjustments', icon: 'adjustments' },
  { to: '/regularization', label: 'Regularization', icon: 'regularization' },
  { to: '/leave', label: 'Leave', icon: 'leave' },
  { to: '/visitors', label: 'Visitors', icon: 'visitors' },
  { to: '/devices', label: 'Devices', icon: 'devices' },
  { to: '/settings', label: 'HR Settings', icon: 'settings' },
];

const navLinkClass = (isActive: boolean) =>
  `sidebar-nav-link flex items-center gap-2 px-2 py-2 rounded-md text-xs font-medium mb-0.5 transition touch-target lg:min-h-0 ${
    isActive ? 'sidebar-nav-link--active font-semibold' : ''
  }`;

export function AdminSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useAuth((s) => s.user);
  const refreshToken = useAuth((s) => s.refreshToken);
  const clear = useAuth((s) => s.clear);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  const onLogout = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // ignore
    } finally {
      clear();
      clearFirstLoginSession();
      qc.removeQueries({ queryKey: ACTIVITY_QUERY_PREFIX });
      navigate('/login');
    }
  };

  const showHrModules = hasOrgAdminLikeAccess(user?.role ?? 'hr.admin');
  const showRecycleBin = canManageRecycleBin(user?.permissions ?? []);
  const showBugReporting = canManageBugReports(user?.permissions ?? []);

  return (
    <aside
      className={`sidebar-shell app-sidebar fixed left-0 flex flex-col z-30 transition-transform duration-200 ease-out lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="lg:hidden flex justify-end px-2 pt-2 pb-1">
        <button
          type="button"
          className="sidebar-icon-btn w-11 h-11 rounded-md flex items-center justify-center shrink-0 touch-target"
          aria-label="Close menu"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      </div>
      <nav className="sidebar-nav-scroll flex-1 py-2 lg:py-3 px-2 overflow-y-auto">
        <div className="text-[9px] uppercase tracking-[1.5px] sidebar-muted px-1.5 pb-1.5 font-semibold">Administration</div>
        {ADMIN_NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/admin'} className={({ isActive }) => navLinkClass(isActive)}>
            <NavIcon name={n.icon} />
            <span>{n.label}</span>
          </NavLink>
        ))}
        {showRecycleBin && (
          <NavLink to="/admin/recycle-bin" className={({ isActive }) => navLinkClass(isActive)}>
            <NavIcon name="adjustments" />
            <span>Recycle bin</span>
          </NavLink>
        )}
        {showBugReporting && (
          <NavLink to="/admin/bug-reporting" className={({ isActive }) => navLinkClass(isActive)}>
            <NavIcon name="reports" />
            <span>Bug reporting</span>
          </NavLink>
        )}
        {showHrModules && (
          <>
            <div className="text-[9px] uppercase tracking-[1.5px] sidebar-muted px-1.5 pb-1.5 pt-2 font-semibold">HR modules</div>
            {HR_NAV.filter((n) => n.to !== '/autogeneration-demo').map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => navLinkClass(isActive)}>
                <NavIcon name={n.icon} />
                <span>{n.label}</span>
              </NavLink>
            ))}
            {isAutogenDemoEnabled() && (
              <NavLink to="/autogeneration-demo" className={({ isActive }) => navLinkClass(isActive)}>
                <NavIcon name="autogen" />
                <span>Auto Gen Demo</span>
              </NavLink>
            )}
          </>
        )}
      </nav>
      <div className="p-2 border-t sidebar-divider">
        <div className="flex items-center gap-2 p-1.5 rounded-md min-w-0">
          <div className="w-8 h-8 rounded-md sidebar-avatar-bg flex items-center justify-center font-bold text-xs shrink-0">
            {(user?.name ?? '??').split(' ').map((s) => s[0]).slice(0, 2).join('')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate">{user?.name ?? 'Unknown'}</div>
            <div className="text-[10px] sidebar-muted truncate">{user?.role ?? ''}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="sidebar-icon-btn mt-1.5 flex items-center gap-2 text-[11px] sidebar-muted hover:text-[var(--sidebar-text)] px-1.5 py-2 touch-target w-full rounded-md transition-colors"
        >
          <NavIcon name="signOut" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
