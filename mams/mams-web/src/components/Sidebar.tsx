import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../store/auth';
import { authApi } from '../api/auth';
import { ACTIVITY_QUERY_PREFIX } from '../api/activity';
import { clearFirstLoginSession } from '../lib/onboarding/session';
import { isAutogenDemoEnabled } from '../config/featureFlags';
import { NavIcon, CloseIcon, type NavIconName } from './navIcons';
import { hasOrgAdminLikeAccess, type Role } from '@mams/types';

const BASE_NAV: { to: string; label: string; icon: NavIconName }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/employees', label: 'Employees', icon: 'employees' },
  { to: '/attendance', label: 'Attendance Log', icon: 'attendance' },
  { to: '/reports', label: 'Reports', icon: 'reports' },
  { to: '/adjustments', label: 'Adjustments', icon: 'adjustments' },
  { to: '/regularization', label: 'Regularization', icon: 'regularization' },
  { to: '/leave', label: 'Leave', icon: 'leave' },
  { to: '/visitors', label: 'Visitors', icon: 'visitors' },
  { to: '/devices', label: 'Devices', icon: 'devices' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

const AUTOGEN_NAV = { to: '/autogeneration-demo', label: 'Auto Genrated Shift Demo', icon: 'autogen' as const };

const COMPLIANCE_ATTENDANCE_NAV = {
  to: '/compliance-attendance',
  label: 'Compliance Attendance',
  icon: 'attendance' as const,
};

function buildNav(permissions: string[], role?: Role) {
  const hasCompliant = permissions.includes('read.compliant');
  const hasReal = permissions.includes('read.real');

  let nav = [...BASE_NAV];
  if (role === 'hr.compliance') {
    nav = nav.filter((item) => item.to !== '/adjustments');
  }
  if (hasCompliant && !hasReal) {
    nav = nav.filter((item) => item.to !== '/attendance');
    nav = [
      ...nav.slice(0, 3),
      { ...COMPLIANCE_ATTENDANCE_NAV, label: 'Attendance Log' },
      ...nav.slice(3),
    ];
  } else if (hasCompliant && hasReal) {
    nav = [
      ...nav.slice(0, 3),
      COMPLIANCE_ATTENDANCE_NAV,
      ...nav.slice(3),
    ];
  }

  if (!isAutogenDemoEnabled()) return nav;
  const attendanceIdx = nav.findIndex((n) => n.to === '/attendance' || n.to === '/compliance-attendance');
  const insertAt = attendanceIdx >= 0 ? attendanceIdx + 1 : 3;
  return [...nav.slice(0, insertAt), AUTOGEN_NAV, ...nav.slice(insertAt)];
}

const navLinkClass = (isActive: boolean) =>
  `sidebar-nav-link flex items-center gap-2 px-2 py-2 rounded-md text-xs font-medium mb-0.5 transition touch-target lg:min-h-0 ${
    isActive ? 'sidebar-nav-link--active font-semibold' : ''
  }`;

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
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
        {user && hasOrgAdminLikeAccess(user.role) && (
          <>
            <div className="text-[9px] uppercase tracking-[1.5px] sidebar-muted px-1.5 pb-1.5 font-semibold">Administration</div>
            <NavLink to="/admin" className={({ isActive }) => navLinkClass(isActive)}>
              <NavIcon name="settings" />
              <span>Admin Console</span>
            </NavLink>
            <div className="text-[9px] uppercase tracking-[1.5px] sidebar-muted px-1.5 pb-1.5 pt-1.5 font-semibold">HR modules</div>
          </>
        )}
        {user && hasOrgAdminLikeAccess(user.role) ? null : (
          <div className="text-[9px] uppercase tracking-[1.5px] sidebar-muted px-1.5 pb-1.5 font-semibold">Navigation</div>
        )}
        {buildNav(user?.permissions ?? [], user?.role as Role | undefined).map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => navLinkClass(isActive)}>
            <NavIcon name={n.icon} />
            <span>{n.label}</span>
          </NavLink>
        ))}
        {(user?.permissions.includes('approve.employee_change') || user?.permissions.includes('write.employee_change')) && (
          <NavLink to="/employee-change-requests" className={({ isActive }) => navLinkClass(isActive)}>
            <NavIcon name="adjustments" />
            <span>Change Requests</span>
          </NavLink>
        )}
        {user?.permissions.includes('read.compliance_activity') && (
          <NavLink to="/compliance-activity" className={({ isActive }) => navLinkClass(isActive)}>
            <NavIcon name="reports" />
            <span>Compliance Activity</span>
          </NavLink>
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
