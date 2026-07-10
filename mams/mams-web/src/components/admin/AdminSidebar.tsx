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
      className={`sidebar-shell app-sidebar fixed left-0 top-0 bottom-0 flex flex-col z-30 transition-transform duration-200 ease-out lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <SidebarBrandHeader
        companyName={companyName}
        companyLogo={settings?.companyLogo}
        onClose={onClose}
      />
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
        {showManageItAdmins && (
          <NavLink to="/admin/bug-reporting/it-admins" className={({ isActive }) => navLinkClass(isActive)}>
            <NavIcon name="employees" />
            <span>Manage IT Admins</span>
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
      <BugReportSidebarFooter />
    </aside>
  );
}
