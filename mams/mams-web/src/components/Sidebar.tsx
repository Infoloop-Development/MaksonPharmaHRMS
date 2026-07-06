import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../store/auth';
import { settingsApi } from '../api/settings';
import { isAutogenDemoEnabled } from '../config/featureFlags';
import { NavIcon, type NavIconName } from './navIcons';
import { SidebarBrandHeader } from './SidebarBrandHeader';
import { BugReportSidebarFooter } from './bugReport/BugReportSidebarFooter';
import { hasOrgAdminLikeAccess, type Role } from '@mams/types';

const BASE_NAV: { to: string; label: string; icon: NavIconName }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/employees', label: 'Employees', icon: 'employees' },
  { to: '/attendance', label: 'Attendance Log', icon: 'attendance' },
  { to: '/adjustments', label: 'Adjustments', icon: 'adjustments' },
  { to: '/regularization', label: 'Regularization', icon: 'regularization' },
  { to: '/leave', label: 'Leave', icon: 'leave' },
  // Change Requests injected here by buildNav (after Leave, before Reports)
  { to: '/reports', label: 'Reports', icon: 'reports' },
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

function buildNav(
  permissions: string[],
  role?: Role,
  canViewChangeRequests = false,
  isCompliant = false,
) {
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
      { to: '/attendance', label: 'Attendance Log', icon: 'attendance' as const },
      ...nav.slice(2),
    ];
  } else if (hasCompliant && hasReal) {
    const attIdx = nav.findIndex((n) => n.to === '/attendance');
    nav = [...nav.slice(0, attIdx + 1), COMPLIANCE_ATTENDANCE_NAV, ...nav.slice(attIdx + 1)];
  }

  // Inject Change Requests after Leave, before Reports (all users including compliance-only)
  if (canViewChangeRequests) {
    const crItem = {
      to: '/employee-change-requests',
      label: isCompliant ? 'Change History' : 'Change Requests',
      icon: 'adjustments' as const,
    };
    const leaveIdx = nav.findIndex((n) => n.to === '/leave');
    const insertAt = leaveIdx >= 0 ? leaveIdx + 1 : nav.findIndex((n) => n.to === '/settings');
    nav = [...nav.slice(0, insertAt), crItem, ...nav.slice(insertAt)];
  }

  // Compliance-only view never gets the autogen demo
  if (hasCompliant && !hasReal) return nav;

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

  const companyName = settings?.companyName ?? 'Makson Group';

  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  return (
     <aside
      className={`sidebar-shell fixed top-0 left-0 bottom-0 w-[250px] max-w-[85vw] flex flex-col z-30 transition-all duration-200 ease-out lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      } ${collapsed ? 'lg:w-[76px]' : 'lg:w-[250px]'}`}
    >
      <SidebarBrandHeader
        companyName={companyName}
        companyLogo={settings?.companyLogo}
        collapsed={collapsed}
        onClose={onClose}
      />
      <button
        type="button"
        className="sidebar-collapse-btn hidden lg:flex items-center justify-center absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 w-7 h-7 rounded-full z-40 ring-1 ring-white/25 shadow-md touch-target-sm transition-all hover:ring-white/50"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={collapsed ? '' : 'rotate-180'}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
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
              style={({ isActive }) => isActive ? { background: 'rgba(255, 255, 255, 0.22)' } : undefined}
            >
              <NavIcon name="settings" />
              {!collapsed && <span className="lg:inline">Admin Console</span>}
            </NavLink>
            {!collapsed && (
              <div className="text-[10px] uppercase tracking-[2px] sidebar-muted px-3 pb-2 pt-3 font-semibold">HR modules</div>
            )}
          </>
        )}
        {buildNav(user?.permissions ?? [], user?.role as Role | undefined, canViewChangeRequests, isCompliant).map((n) => (
          <Fragment key={n.to}>
            {n.to === '/settings' && (
              <div className="my-2 border-t sidebar-divider opacity-40" />
            )}
            <NavLink
              to={n.to}
              title={collapsed ? n.label : undefined}
              className={({ isActive }) =>
                `sidebar-nav-link flex items-center gap-3 px-4 py-3 lg:py-2.5 rounded-md text-[13px] font-medium mb-0.5 transition touch-target ${
                  collapsed ? 'lg:justify-center' : ''
                } ${isActive ? 'sidebar-nav-link--active font-semibold' : ''}`
              }
              style={({ isActive }) => isActive ? { background: 'rgba(255, 255, 255, 0.22)' } : undefined}
            >
              <NavIcon name={n.icon} />
              {!collapsed && <span>{n.label}</span>}
            </NavLink>
          </Fragment>
        ))}
        {canViewComplianceActivity && (
          <NavLink
            to="/compliance-activity"
            title={collapsed ? 'Compliance Activity' : undefined}
            className={({ isActive }) =>
              `sidebar-nav-link flex items-center gap-3 px-4 py-3 lg:py-2.5 rounded-md text-[13px] font-medium mb-0.5 transition touch-target ${
                collapsed ? 'lg:justify-center' : ''
              } ${isActive ? 'sidebar-nav-link--active font-semibold' : ''}`
            }
            style={({ isActive }) => isActive ? { background: 'rgba(255, 255, 255, 0.22)' } : undefined}
          >
            <NavIcon name="reports" />
            {!collapsed && <span>Compliance Activity</span>}
          </NavLink>
        )}
      </nav>
      <BugReportSidebarFooter collapsed={collapsed} />
    </aside>
  );
}
