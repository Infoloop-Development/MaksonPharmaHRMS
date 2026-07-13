import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { fmtIstHeaderDate } from '../lib/format';
import { useTimeDisplay } from '../store/timeFormat';
import { formatIstInstantNoSeconds } from '../lib/timeFormat';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { ThemeToggle } from './ui/ThemeToggle';
import { NotificationBell } from './notifications/NotificationBell';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { clearFirstLoginSession } from '../lib/onboarding/session';
import { ACTIVITY_QUERY_PREFIX } from '../api/activity';

function initials(name?: string | null) {
  return (name ?? '??')
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const user = useAuth((s) => s.user);
  const isOnline = useOnlineStatus();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const { format } = useTimeDisplay();
  const refreshToken = useAuth((s) => s.refreshToken);
  const clear = useAuth((s) => s.clear);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const onLogout = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      /* ignore */
    } finally {
      clear();
      clearFirstLoginSession();
      qc.removeQueries({ queryKey: ACTIVITY_QUERY_PREFIX });
      navigate('/login');
    }
  };

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [profileMenuOpen]);

  return (
    <header className="app-topbar bg-surface">
      <div className="app-topbar-inner">
        <button
          type="button"
          className="app-topbar-menu-btn lg:hidden touch-target"
          aria-label="Open menu"
          onClick={onOpenMenu}
        >
          <span className="block w-4 h-0.5 bg-text rounded" />
          <span className="block w-4 h-0.5 bg-text rounded" />
          <span className="block w-4 h-0.5 bg-text rounded" />
        </button>

        <div className="app-topbar-actions ml-auto">
          {/* Mobile: one cycle button. Desktop: 3-way segment control. */}
          <div className="sm:hidden">
            <ThemeToggle cycle />
          </div>
          <div className="hidden sm:block">
            <ThemeToggle compact />
          </div>

          <div className="app-topbar-clock" aria-live="polite">
            <div className="app-topbar-clock-time">
              <span
                className={isOnline ? 'live-dot' : 'live-dot live-dot-offline'}
                aria-label={isOnline ? 'Online' : 'Offline'}
              />
              {formatIstInstantNoSeconds(now, format)}
            </div>
            <div className="app-topbar-clock-date">{fmtIstHeaderDate(now)}</div>
          </div>

          {user && (
            <div className="app-topbar-bell">
              <NotificationBell />
            </div>
          )}

          <div className="app-topbar-profile relative flex items-center shrink-0" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setProfileMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
              aria-label={user?.name ? `Account menu for ${user.name}` : 'Account menu'}
              className="app-topbar-avatar-btn"
            >
              <span className="app-topbar-avatar">{initials(user?.name)}</span>
            </button>

            {profileMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-56 rounded-md border border-border bg-surface shadow-lg overflow-hidden z-20"
              >
                <div className="px-3 py-2.5 border-b border-border bg-surface2/40">
                  <div className="text-sm font-semibold text-text truncate">{user?.name ?? 'Unknown'}</div>
                  {user?.email && (
                    <div className="text-xs text-text-muted truncate mt-0.5">{user.email}</div>
                  )}
                </div>
                <Link
                  to="/settings"
                  role="menuitem"
                  onClick={() => setProfileMenuOpen(false)}
                  className="block px-3 py-2.5 text-sm hover:bg-surface2 transition-colors min-h-[44px] flex items-center"
                >
                  Profile
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={onLogout}
                  className="block w-full text-left px-3 py-2.5 text-sm text-red hover:bg-surface2 transition-colors min-h-[44px]"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
