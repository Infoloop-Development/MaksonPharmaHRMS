import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ToastContainer } from './ui/Toast';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);

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
