import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../store/auth';
import { settingsApi } from '../api/settings';
import { authApi } from '../api/auth';
import { ACTIVITY_QUERY_PREFIX } from '../api/activity';
import { clearFirstLoginSession } from '../lib/onboarding/session';
import { isAutogenDemoEnabled } from '../config/featureFlags';
import { NavIcon, type NavIconName } from './navIcons';
import { isOrgAdminRole } from '@mams/types';

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

function buildNav() {
  if (!isAutogenDemoEnabled()) return [...BASE_NAV];
  return [...BASE_NAV.slice(0, 4), AUTOGEN_NAV, ...BASE_NAV.slice(4)];
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useAuth((s) => s.user);
  const refreshToken = useAuth((s) => s.refreshToken);
  const clear = useAuth((s) => s.clear);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
    staleTime: 60_000,
  });

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
      className={`sidebar-shell fixed top-0 left-0 bottom-0 w-[250px] max-w-[85vw] flex flex-col z-30 transition-transform duration-200 ease-out lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="px-4 lg:px-6 py-4 lg:py-5 border-b sidebar-divider flex items-start justify-between gap-2">
        <div>
          {settings?.companyLogo && (
            <img
              src={settings.companyLogo}
              alt="Company logo"
              className="w-9 h-9 rounded-md object-contain sidebar-logo-bg p-0.5 mb-2"
            />
          )}
          <div className="text-[10px] tracking-[2px] uppercase sidebar-muted mb-1">Attendance System</div>
          <h1 className="text-base font-bold">{settings?.companyName ?? 'Makson Group'}</h1>
        </div>
        <button
          type="button"
          className="sidebar-icon-btn lg:hidden w-10 h-10 rounded-md flex items-center justify-center shrink-0 touch-target"
          aria-label="Close menu"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <nav className="sidebar-nav-scroll flex-1 py-4 px-3 overflow-y-auto">
        {user && isOrgAdminRole(user.role) && (
          <>
            <div className="text-[10px] uppercase tracking-[2px] sidebar-muted px-3 pb-2 font-semibold">Administration</div>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `sidebar-nav-link flex items-center gap-3 px-4 py-3 lg:py-2.5 rounded-md text-[13px] font-medium mb-0.5 transition touch-target ${
                  isActive ? 'sidebar-nav-link--active font-semibold' : ''
                }`
              }
            >
              <NavIcon name="settings" />
              <span>Admin Console</span>
            </NavLink>
            <div className="text-[10px] uppercase tracking-[2px] sidebar-muted px-3 pb-2 pt-3 font-semibold">HR modules</div>
          </>
        )}
        {user && isOrgAdminRole(user.role) ? null : (
          <div className="text-[10px] uppercase tracking-[2px] sidebar-muted px-3 pb-2 font-semibold">Navigation</div>
        )}
        {buildNav().map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              `sidebar-nav-link flex items-center gap-3 px-4 py-3 lg:py-2.5 rounded-md text-[13px] font-medium mb-0.5 transition touch-target ${
                isActive ? 'sidebar-nav-link--active font-semibold' : ''
              }`
            }
          >
            <NavIcon name={n.icon} />
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t sidebar-divider">
        <div className="flex items-center gap-2.5 p-2 rounded-md">
          <div className="w-9 h-9 rounded-md sidebar-avatar-bg flex items-center justify-center font-bold text-sm">
            {(user?.name ?? '??').split(' ').map((s) => s[0]).slice(0, 2).join('')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold truncate">{user?.name ?? 'Unknown'}</div>
            <div className="text-[11px] sidebar-muted truncate">{user?.role ?? ''}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="sidebar-icon-btn mt-2 flex items-center gap-2.5 text-[12px] sidebar-muted hover:text-[var(--sidebar-text)] px-2 py-2 touch-target w-full rounded-md transition-colors"
        >
          <NavIcon name="signOut" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
