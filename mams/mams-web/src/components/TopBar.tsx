import { useEffect, useState } from 'react';
import { useAuth } from '../store/auth';
import { fmtIstTopBarDate } from '../lib/format';
import { useTimeDisplay } from '../store/timeFormat';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { ThemeToggle } from './ui/ThemeToggle';
import { NotificationBell } from './notifications/NotificationBell';

const DEFAULT_COMPANY_NAME = 'Makson Group';

export function TopBar({
  onOpenMenu,
  companyName,
  companyLogo,
}: {
  onOpenMenu: () => void;
  companyName?: string | null;
  companyLogo?: string | null;
}) {
  const user = useAuth((s) => s.user);
  const isOnline = useOnlineStatus();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const isCompliant = user?.viewMode === 'compliant';
  const badgeFull = isCompliant ? 'COMPLIANT VIEW (8-hour)' : 'REAL VIEW (12-hour)';
  const badgeShort = isCompliant ? 'COMPLIANT' : 'REAL';
  const displayName = companyName?.trim() || DEFAULT_COMPANY_NAME;
  const { fmtTime } = useTimeDisplay();

  return (
    <header className="app-topbar fixed top-0 left-0 right-0 z-40 bg-surface border-b border-border flex items-center justify-between gap-2 px-3 md:px-6 w-full">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <button
          type="button"
          className="lg:hidden shrink-0 w-11 h-11 rounded-md border border-border bg-surface2 hover:bg-border/50 flex flex-col items-center justify-center gap-0.5 touch-target"
          aria-label="Open menu"
          onClick={onOpenMenu}
        >
          <span className="block w-5 h-0.5 bg-text rounded" />
          <span className="block w-5 h-0.5 bg-text rounded" />
          <span className="block w-5 h-0.5 bg-text rounded" />
        </button>
        {companyLogo && (
          <img
            src={companyLogo}
            alt=""
            className="app-topbar-logo w-7 h-7 md:w-8 md:h-8 rounded-md object-contain bg-surface2 p-0.5 shrink-0"
          />
        )}
        <h1 className="text-sm md:text-base font-bold truncate" title={displayName}>
          {displayName}
        </h1>
        <span
          title={badgeFull}
          className={`md:hidden inline-block shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            isCompliant ? 'bg-amber-bg text-amber' : 'bg-primary-bg text-primary-on-bg'
          }`}
        >
          {badgeShort}
        </span>
      </div>

      <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
        <NotificationBell />
        <ThemeToggle compact />
        <span
          title={badgeFull}
          className={`hidden md:inline text-[10px] font-semibold px-2 py-1 rounded-full ${
            isCompliant ? 'bg-amber-bg text-amber' : 'bg-primary-bg text-primary-on-bg'
          }`}
        >
          {badgeFull}
        </span>
        <div
          className="text-right leading-tight shrink-0"
          title={`${fmtIstTopBarDate(now)} · ${fmtTime(now)}`}
        >
          <div className="text-[10px] text-text-subtle whitespace-nowrap">{fmtIstTopBarDate(now)}</div>
          <div className="font-mono text-xs md:text-sm font-semibold tracking-wide text-text whitespace-nowrap">
            <span
              className={isOnline ? 'live-dot' : 'live-dot live-dot-offline'}
              aria-label={isOnline ? 'Online' : 'Offline'}
            />
            {fmtTime(now)}
          </div>
        </div>
      </div>
    </header>
  );
}
