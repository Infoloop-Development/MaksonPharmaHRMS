import { NavLink, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../store/auth';
import { settingsApi } from '../../api/settings';
import { isAutogenDemoEnabled } from '../../config/featureFlags';
import { NavIcon, type NavIconName } from '../navIcons';
import { SidebarBrandHeader } from '../SidebarBrandHeader';
import { BugReportSidebarFooter } from '../bugReport/BugReportSidebarFooter';
import { canManageBugReports, canManageRecycleBin, canManageOrgUsers, hasOrgAdminLikeAccess } from '@mams/types';

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
  { to: '/leave', label: 'Leave', icon: 'leave' },
  { to: '/visitors', label: 'Visitors', icon: 'visitors' },
  { to: '/devices', label: 'Devices', icon: 'devices' },
  { to: '/settings', label: 'HR Settings', icon: 'settings' },
];

const navLinkClass = (isActive: boolean, collapsed: boolean) =>
  `sidebar-nav-link flex items-center gap-2 px-2 py-2 rounded-md text-xs font-medium mb-0.5 transition touch-target lg:min-h-0 ${
    collapsed ? 'lg:justify-center' : ''
  } ${isActive ? 'sidebar-nav-link--active font-semibold' : ''}`;

export function AdminSidebar({
  open,
  onClose,
  collapsed = false,
  onToggleCollapsed,
}: {
  open: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const user = useAuth((s) => s.user);
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

  const showHrModules = hasOrgAdminLikeAccess(user?.role ?? 'hr.admin');
  const showRecycleBin = canManageRecycleBin(user?.permissions ?? []);
  const showBugReporting = canManageBugReports(user?.permissions ?? []);
  const showManageItAdmins = canManageOrgUsers(user?.permissions ?? []);

  return (
    <aside
      className={`sidebar-shell app-sidebar fixed left-0 top-0 bottom-0 flex flex-col z-30 transition-all duration-200 ease-out lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <SidebarBrandHeader
        companyName={companyName}
        companyLogo={settings?.companyLogo}
        collapsed={collapsed}
        onClose={onClose}
      />
      {onToggleCollapsed && (
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
      )}
      <nav className="sidebar-nav-scroll flex-1 py-2 lg:py-3 px-2 overflow-y-auto">
        {!collapsed && (
          <div className="text-[9px] uppercase tracking-[1.5px] sidebar-muted px-1.5 pb-1.5 font-semibold">Administration</div>
        )}
        {ADMIN_NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/admin'}
            title={collapsed ? `Administration: ${n.label}` : undefined}
            className={({ isActive }) => navLinkClass(isActive, collapsed)}
          >
            <NavIcon name={n.icon} />
            {!collapsed && <span>{n.label}</span>}
          </NavLink>
        ))}
        {showRecycleBin && (
          <NavLink
            to="/admin/recycle-bin"
            title={collapsed ? 'Administration: Recycle bin' : undefined}
            className={({ isActive }) => navLinkClass(isActive, collapsed)}
          >
            <NavIcon name="adjustments" />
            {!collapsed && <span>Recycle bin</span>}
          </NavLink>
        )}
        {showBugReporting && (
          <NavLink
            to="/admin/bug-reporting"
            title={collapsed ? 'Administration: Bug reporting' : undefined}
            className={({ isActive }) => navLinkClass(isActive, collapsed)}
          >
            <NavIcon name="reports" />
            {!collapsed && <span>Bug reporting</span>}
          </NavLink>
        )}
        {showManageItAdmins && (
          <NavLink
            to="/admin/bug-reporting/it-admins"
            title={collapsed ? 'Administration: Manage IT Admins' : undefined}
            className={({ isActive }) => navLinkClass(isActive, collapsed)}
          >
            <NavIcon name="employees" />
            {!collapsed && <span>Manage IT Admins</span>}
          </NavLink>
        )}
        {showHrModules && (
          <>
            {collapsed ? (
              <div className="my-2 border-t sidebar-divider opacity-40" />
            ) : (
              <div className="text-[9px] uppercase tracking-[1.5px] sidebar-muted px-1.5 pb-1.5 pt-2 font-semibold">HR modules</div>
            )}
            {HR_NAV.filter((n) => n.to !== '/autogeneration-demo').map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                title={collapsed ? `HR: ${n.label}` : undefined}
                className={({ isActive }) => navLinkClass(isActive, collapsed)}
              >
                <NavIcon name={n.icon} />
                {!collapsed && <span>{n.label}</span>}
              </NavLink>
            ))}
            {isAutogenDemoEnabled() && (
              <NavLink
                to="/autogeneration-demo"
                title={collapsed ? 'HR: Auto Gen Demo' : undefined}
                className={({ isActive }) => navLinkClass(isActive, collapsed)}
              >
                <NavIcon name="autogen" />
                {!collapsed && <span>Auto Gen Demo</span>}
              </NavLink>
            )}
          </>
        )}
      </nav>
      <BugReportSidebarFooter collapsed={collapsed} />
    </aside>
  );
}
