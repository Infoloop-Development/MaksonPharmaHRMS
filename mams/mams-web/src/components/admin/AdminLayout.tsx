import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../store/auth';
import { canAccessAdminConsole } from '@mams/types';
import { AdminSidebar } from './AdminSidebar';
import { TopBar } from '../TopBar';
import { MobileBottomNav } from '../MobileBottomNav';
import { ToastContainer } from '../ui/Toast';
import { settingsApi } from '../../api/settings';
import { TimeFormatProvider } from '../../store/timeFormat';
import { BugReportMobileTrigger } from '../bugReport/BugReportSidebarFooter';
import { hasMobileBottomNav } from '../../lib/mobileBottomNav';
import { useState, useCallback, useEffect } from 'react';

export function AdminLayout() {
  const user = useAuth((s) => s.user);
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
    staleTime: 60_000,
  });

  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    if (settings?.favicon) {
      link.href = settings.favicon;
      link.type = settings.favicon.includes('svg') ? 'image/svg+xml' : 'image/png';
    }
  }, [settings?.favicon]);

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (!canAccessAdminConsole(user.role, user.permissions)) {
    return <Navigate to="/dashboard" replace />;
  }

  const showMobileBottomNav = hasMobileBottomNav(user?.role);

  return (
    <TimeFormatProvider format={settings?.timeFormat ?? '12h'}>
      <div
        className={`min-h-screen overflow-x-hidden bg-bg${showMobileBottomNav ? ' has-mobile-bottom-nav' : ''}`}
      >
        <AdminSidebar open={sidebarOpen} onClose={closeSidebar} />
        {sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-20 bg-black/40 lg:hidden app-sidebar-backdrop"
            aria-label="Close menu"
            onClick={closeSidebar}
          />
        )}
        <div
          className={`app-content-column app-shell-with-sidebar${
            showMobileBottomNav ? ' has-mobile-bottom-nav' : ''
          }`}
        >
          <TopBar onOpenMenu={openSidebar} />
          <main className="app-shell-main px-4 pb-4 md:px-6 md:pb-6 flex-1 overflow-x-hidden min-w-0">
            <Outlet />
          </main>
          <MobileBottomNav />
        </div>
        <ToastContainer />
        <BugReportMobileTrigger suppressed={sidebarOpen} />
      </div>
    </TimeFormatProvider>
  );
}
