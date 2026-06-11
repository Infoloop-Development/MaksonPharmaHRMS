import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ToastContainer } from './ui/Toast';
import { authApi } from '../api/auth';
import { settingsApi } from '../api/settings';
import { useAuth } from '../store/auth';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const accessToken = useAuth((s) => s.accessToken);
  const refreshToken = useAuth((s) => s.refreshToken);
  const setUser = useAuth((s) => s.setUser);
  const setAuth = useAuth((s) => s.setAuth);

  useEffect(() => {
    if (!accessToken) return;
    authApi
      .me()
      .then(async ({ user }) => {
        const prev = useAuth.getState().user;
        setUser(user);
        const prevPerms = prev?.permissions ?? [];
        const newPerms = user.permissions ?? [];
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

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          aria-label="Close menu"
          onClick={closeSidebar}
        />
      )}
      <div className="flex-1 flex flex-col min-w-0 ml-0 lg:ml-[250px]">
        <TopBar onOpenMenu={openSidebar} />
        <main className="p-4 md:p-6 flex-1 overflow-x-hidden min-w-0">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
