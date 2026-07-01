import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { AdminSidebar } from './admin/AdminSidebar';
import { TopBar } from './TopBar';
import { MobileBottomNav } from './MobileBottomNav';
import { ToastContainer } from './ui/Toast';
import { authApi } from '../api/auth';
import { settingsApi } from '../api/settings';
import { useAuth } from '../store/auth';
import { hasOrgAdminLikeAccess } from '@mams/types';
import { hasMobileBottomNav } from '../lib/mobileBottomNav';
import { TimeFormatProvider } from '../store/timeFormat';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const accessToken = useAuth((s) => s.accessToken);
  const user = useAuth((s) => s.user);
  const refreshToken = useAuth((s) => s.refreshToken);
  const setUser = useAuth((s) => s.setUser);
  const setAuth = useAuth((s) => s.setAuth);

  useEffect(() => {
    if (!accessToken) return;
    authApi
      .me()
      .then(async ({ user: me }) => {
        const prev = useAuth.getState().user;
        setUser(me);
        const prevPerms = prev?.permissions ?? [];
        const newPerms = me.permissions ?? [];
        const permsChanged =
          prevPerms.length !== newPerms.length || newPerms.some((p) => !prevPerms.includes(p));
        if (permsChanged && refreshToken) {
          const data = await authApi.refresh(refreshToken);
          setAuth(data);
        }
      })
      .catch(() => {
        /* session refresh handles invalid tokens */
      });
  }, [accessToken, refreshToken, setUser, setAuth]);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
    staleTime: 60_000,
    enabled: Boolean(accessToken),
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
    } else {
      link.href = '/favicon.ico';
      link.type = 'image/x-icon';
    }
  }, [settings?.favicon]);

  const showMobileBottomNav = hasMobileBottomNav(user?.role);
  const useAdminSidebar = hasOrgAdminLikeAccess(user?.role ?? 'hr.admin');

  return (
    <TimeFormatProvider format={settings?.timeFormat ?? '12h'}>
      <div
        className={`min-h-screen overflow-x-hidden bg-bg${showMobileBottomNav ? ' has-mobile-bottom-nav' : ''}`}
      >
        <TopBar
          onOpenMenu={openSidebar}
          companyName={settings?.companyName}
          companyLogo={settings?.companyLogo}
        />
        {useAdminSidebar ? (
          <AdminSidebar open={sidebarOpen} onClose={closeSidebar} />
        ) : (
          <Sidebar open={sidebarOpen} onClose={closeSidebar} />
        )}
        {sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-20 bg-black/40 lg:hidden app-sidebar-backdrop"
            aria-label="Close menu"
            onClick={closeSidebar}
          />
        )}
        <main
          className={`app-shell-main app-shell-with-sidebar px-4 pb-4 md:px-6 md:pb-6 flex-1 overflow-x-hidden${
            showMobileBottomNav ? ' has-mobile-bottom-nav' : ''
          }`}
        >
          <Outlet />
        </main>
        <MobileBottomNav />
        <ToastContainer />
      </div>
    </TimeFormatProvider>
  );
}
