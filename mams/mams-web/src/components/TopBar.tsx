import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { fmtIstHeaderDate } from '../lib/format';
import { useTimeDisplay } from '../store/timeFormat';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { ThemeToggle } from './ui/ThemeToggle';
import { isAutogenDemoEnabled } from '../config/featureFlags';

function pageTitle(pathname: string): string {
  if (pathname === '/dashboard' || pathname === '/') return 'Dashboard';
  if (pathname.startsWith('/employees/')) return 'Employee Detail';
  if (pathname === '/employees') return 'Employees';
  if (pathname === '/attendance') return 'Attendance Log';
  if (pathname === '/reports') return 'Reports';
  if (pathname === '/adjustments') return 'Adjustments';
  if (pathname === '/regularization') return 'Regularization';
  if (pathname === '/leave') return 'Leave';
  if (pathname === '/devices') return 'Devices';
  if (pathname === '/settings') return 'Settings';
  if (pathname === '/autogeneration-demo' && isAutogenDemoEnabled()) return 'Auto Genrated Shift Demo';
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin') return 'Admin Overview';
    if (pathname.startsWith('/admin/users')) return 'Users & Roles';
    if (pathname.startsWith('/admin/organization')) return 'Organization';
    if (pathname.startsWith('/admin/security')) return 'Security';
    if (pathname.startsWith('/admin/audit')) return 'Audit Log';
    if (pathname.startsWith('/admin/health')) return 'System Health';
    if (pathname.startsWith('/admin/feature-flags')) return 'Feature Flags';
    return 'Administration';
  }
  if (pathname === '/change-password') return 'Change Password';
  return 'MAMS';
}

export function TopBar({ onOpenMenu, title: titleOverride }: { onOpenMenu: () => void; title?: string }) {
  const user = useAuth((s) => s.user);
  const location = useLocation();
  const isOnline = useOnlineStatus();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const isCompliant = user?.viewMode === 'compliant';
  const badgeFull = isCompliant ? 'COMPLIANT VIEW (8-hour)' : 'REAL VIEW (12-hour)';
  const badgeShort = isCompliant ? 'COMPLIANT' : 'REAL';
  const title = titleOverride ?? pageTitle(location.pathname);
  const { fmtTime } = useTimeDisplay();

  return (
    <header className="min-h-16 bg-surface border-b border-border flex items-center justify-between gap-2 px-4 md:px-7 py-2 sticky top-0 z-10">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          className="lg:hidden shrink-0 w-11 h-11 rounded-md border border-border bg-surface2 hover:bg-border/50 flex flex-col items-center justify-center gap-1 touch-target"
          aria-label="Open menu"
          onClick={onOpenMenu}
        >
          <span className="block w-5 h-0.5 bg-text rounded" />
          <span className="block w-5 h-0.5 bg-text rounded" />
          <span className="block w-5 h-0.5 bg-text rounded" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-bold truncate">{title}</h1>
          <span
            title={badgeFull}
            className={`md:hidden inline-block mt-0.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
              isCompliant ? 'bg-amber-bg text-amber' : 'bg-primary-bg text-primary-on-bg'
            }`}
          >
            {badgeShort}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        <ThemeToggle compact />
        <span
          title={badgeFull}
          className={`hidden md:inline text-[11px] font-semibold px-2.5 py-1.5 rounded-full ${
            isCompliant ? 'bg-amber-bg text-amber' : 'bg-primary-bg text-primary-on-bg'
          }`}
        >
          {badgeFull}
        </span>
        <div className="text-right">
          <div className="font-mono text-sm font-semibold tracking-wide text-text">
            <span
              className={isOnline ? 'live-dot' : 'live-dot live-dot-offline'}
              aria-label={isOnline ? 'Online' : 'Offline'}
            />
            {fmtTime(now)}
          </div>
          <div className="text-[11px] text-text-subtle mt-0.5">{fmtIstHeaderDate(now)}</div>
        </div>
      </div>
    </header>
  );
}
