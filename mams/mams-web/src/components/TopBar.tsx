import { useEffect, useState } from 'react';
import { useAuth } from '../store/auth';
import { fmtIstTopBarDate } from '../lib/format';
import { useTimeDisplay } from '../store/timeFormat';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { ThemeToggle } from './ui/ThemeToggle';
import { NotificationBell } from './notifications/NotificationBell';
import { Tooltip } from './ui/Tooltip';
import { TOPBAR_TOOLTIPS } from '../lib/tooltips/statCardTooltips';

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
    <header className="app-topbar fixed top-0 left-0 right-0 z-40 bg-surface border-b border-border w-full">
      <div className="app-topbar-inner">
        <div className="app-topbar-brand">
          <button
            type="button"
            className="lg:hidden app-topbar-menu-btn shrink-0 touch-target"
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
          <h1 className="app-topbar-title truncate" title={displayName}>
            {displayName}
          </h1>
          <Tooltip content={isCompliant ? TOPBAR_TOOLTIPS.compliantView : TOPBAR_TOOLTIPS.realView}>
            <span className={`app-topbar-view-badge app-topbar-view-badge--mobile ${isCompliant ? 'is-compliant' : 'is-real'}`}>
              {badgeShort}
            </span>
          </Tooltip>
        </div>

        <div className="app-topbar-actions">
          <ThemeToggle compact />
          <Tooltip content={isCompliant ? TOPBAR_TOOLTIPS.compliantView : TOPBAR_TOOLTIPS.realView}>
            <span className={`app-topbar-view-badge app-topbar-view-badge--desktop ${isCompliant ? 'is-compliant' : 'is-real'}`}>
              {badgeFull}
            </span>
          </Tooltip>
          <Tooltip content={TOPBAR_TOOLTIPS.clock}>
          <div className="app-topbar-clock">
            <div className="app-topbar-clock-date">{fmtIstTopBarDate(now)}</div>
            <div className="app-topbar-clock-time">
              <span
                className={isOnline ? 'live-dot' : 'live-dot live-dot-offline'}
                aria-label={isOnline ? 'Online' : 'Offline'}
              />
              {fmtTime(now)}
            </div>
          </div>
          </Tooltip>
          <div className="app-topbar-bell">
            <NotificationBell />
          </div>
        </div>
      </div>
    </header>
  );
}
