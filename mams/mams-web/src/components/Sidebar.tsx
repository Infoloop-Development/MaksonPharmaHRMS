import { NavLink, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../store/auth';
import { settingsApi } from '../api/settings';
import { isAutogenDemoEnabled } from '../config/featureFlags';
import { NavIcon, type NavIconName } from './navIcons';
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
const COMPLAINCE_HIDDEN_ROUTES = new Set(['/attendance', '/adjustments', '/regularization', '/visitors', '/devices', '/autogeneration-demo']);

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
    nav = nav.filter((item) => !COMPLAINCE_HIDDEN_ROUTES.has(item.to));
    nav = [
      ...nav.slice(0, 2),
      { ...COMPLIANCE_ATTENDANCE_NAV, label: 'Attendance Log' },
      ...nav.slice(2),
    ];
    return nav;
  }

  if (hasCompliant && hasReal) {
    nav = [...nav.slice(0, 3), COMPLIANCE_ATTENDANCE_NAV, ...nav.slice(3)];
  }

  if (!isAutogenDemoEnabled()) return nav;
  const attendanceIdx = nav.findIndex((n) => n.to === '/attendance' || n.to === '/compliance-attendance');
  const insertAt = attendanceIdx >= 0 ? attendanceIdx + 1 : 3;
  return [...nav.slice(0, insertAt), AUTOGEN_NAV, ...nav.slice(insertAt)];
}

export function Sidebar({ open, onClose,collapsed,onToggleCollapsed }: { open: boolean; onClose: () => void; collapsed:boolean; onToggleCollapsed: () => void; }) {
  const user = useAuth((s) => s.user);
  const isCompliant = user?.viewMode === 'compliant';
  const canViewComplianceActivity = user?.permissions.includes('read.compliance_activity') ?? false;
  const canViewChangeRequests = (user?.permissions.includes('approve.employee_change') || user?.permissions.includes('write.employee_change')) ?? false;
  const location = useLocation();
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
    staleTime: 60_000,
  });

  const companyInitial = (settings?.companyName ?? 'Makson Group').charAt(0).toUpperCase();

  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  return (
     <aside
      className={`sidebar-shell fixed top-0 left-0 bottom-0 w-[250px] max-w-[85vw] flex flex-col z-30 transition-all duration-200 ease-out lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      } ${collapsed ? 'lg:w-[76px]' : 'lg:w-[250px]'}`}
    >
      <div className="px-4 lg:px-6 py-4 lg:py-5 border-b sidebar-divider flex items-start justify-between gap-2">
        <div className={collapsed ? 'lg:hidden' : ''}>
          {settings?.companyLogo ? (
            <img
              src={settings.companyLogo}
              alt="Company logo"
              className="w-9 h-9 rounded-md object-contain sidebar-logo-bg p-0.5 mb-2"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-md sidebar-logo-bg flex items-center justify-center font-bold text-sm mb-2 select-none"
              aria-hidden
            >
              {companyInitial}
            </div>
          )}
          <div className="text-[10px] tracking-[2px] uppercase sidebar-muted mb-1">Attendance System</div>
          <h1 className="text-base font-bold">{settings?.companyName ?? 'Makson Group'}</h1>
        </div>
        {collapsed && (
          settings?.companyLogo ? (
            <img
              src={settings.companyLogo}
              alt="Company logo"
              className="hidden lg:block w-9 h-9 rounded-md object-contain sidebar-logo-bg p-0.5 mx-auto"
            />
          ) : (
            <div
              className="hidden lg:flex w-9 h-9 rounded-md sidebar-logo-bg items-center justify-center font-bold text-sm mx-auto select-none"
              aria-hidden
            >
              {companyInitial}
            </div>
          )
        )}
        <button
          type="button"
          className="sidebar-icon-btn hidden lg:flex w-8 h-8 rounded-md items-center justify-center shrink-0 touch-target-sm"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={onToggleCollapsed}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={collapsed ? 'rotate-180' : ''}>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
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
        {user && hasOrgAdminLikeAccess(user.role) && (
          <>
            <div className="text-[10px] uppercase tracking-[2px] sidebar-muted px-3 pb-2 font-semibold">Administration</div>
            <NavLink
              to="/admin"
              title={collapsed ? "Admin Console" : undefined}
              className={({ isActive }) =>
                `sidebar-nav-link flex items-center gap-3 px-4 py-3 lg:py-2.5 rounded-md text-[13px] font-medium mb-0.5 transition touch-target ${
                  collapsed ? 'lg:justify-center': ''}
                  ${isActive ? 'sidebar-nav-link--active font-semibold' : ''
                }`
              }
            >
              <NavIcon name="settings" />
              {!collapsed && <span className="lg:inline">Admin Console</span>}
            </NavLink>
            {!collapsed && (
              <div className="text-[10px] uppercase tracking-[2px] sidebar-muted px-3 pb-2 pt-3 font-semibold">HR modules</div>
            )}
          </>
        )}
        {(!user || !hasOrgAdminLikeAccess(user.role)) && !collapsed && (
          <div className="text-[10px] uppercase tracking-[2px] sidebar-muted px-3 pb-2 font-semibold">Navigation</div>
        )}
        {buildNav(user?.permissions ?? [], user?.role as Role | undefined).map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            title={collapsed ? n.label : undefined}
            className={({ isActive }) =>
              `sidebar-nav-link flex items-center gap-3 px-4 py-3 lg:py-2.5 rounded-md text-[13px] font-medium mb-0.5 transition touch-target ${
                collapsed ? 'lg:justify-center' : ''
              } ${isActive ? 'sidebar-nav-link--active font-semibold' : ''}`
            }
          >
            <NavIcon name={n.icon} />
            {!collapsed && <span>{n.label}</span>}
          </NavLink>
        ))}
        {canViewChangeRequests && (
          <NavLink
            to="/employee-change-requests"
            title={collapsed ? (isCompliant ? 'Change History' : 'Employee Change Requests') : undefined}
            className={({ isActive }) =>
              `sidebar-nav-link flex items-center gap-3 px-4 py-3 lg:py-2.5 rounded-md text-[13px] font-medium mb-0.5 transition touch-target ${
                collapsed ? 'lg:justify-center' : ''
              } ${isActive ? 'sidebar-nav-link--active font-semibold' : ''}`
            }
          >
            <NavIcon name="adjustments" />
            {!collapsed && <span>{isCompliant ? 'Change History' : 'Change Requests'}</span>}
          </NavLink>
        )}
        {canViewComplianceActivity && (
          <NavLink
            to="/compliance-activity"
            title={collapsed ? 'Compliance Activity' : undefined}
            className={({ isActive }) =>
              `sidebar-nav-link flex items-center gap-3 px-4 py-3 lg:py-2.5 rounded-md text-[13px] font-medium mb-0.5 transition touch-target ${
                collapsed ? 'lg:justify-center' : ''
              } ${isActive ? 'sidebar-nav-link--active font-semibold' : ''}`
            }
          >
            <NavIcon name="reports" />
            {!collapsed && <span>Compliance Activity</span>}
          </NavLink>
        )}
      </nav>
    </aside>
  );
}
