import { NavLink, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../store/auth';
import { settingsApi } from '../api/settings';
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
const COMPLAINCE_HIDDEN_ROUTES = new Set(['/attendance', '/adjustments', '/regularization', '/visitors', '/autogeneration-demo']);

function buildNav(isCompliant: boolean) {
  let nav = [...BASE_NAV];
  if (isAutogenDemoEnabled()) nav = [...nav.slice(0,4), AUTOGEN_NAV, ...nav.slice(4)];
  if (isCompliant) nav = nav.filter((n) => !COMPLAINCE_HIDDEN_ROUTES.has(n.to));
  return nav;
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useAuth((s) => s.user);
  const isCompliant = user?.viewMode === 'compliant';
  const location = useLocation();
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
    staleTime: 60_000,
  });

  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

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
        {buildNav(isCompliant).map((n) => (
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
    </aside>
  );
}
