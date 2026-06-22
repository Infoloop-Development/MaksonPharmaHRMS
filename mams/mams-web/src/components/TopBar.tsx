import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { fmtIstHeaderDate } from '../lib/format';
import { useTimeDisplay } from '../store/timeFormat';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { isAutogenDemoEnabled } from '../config/featureFlags';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { clearFirstLoginSession } from '../lib/onboarding/session';
import { ACTIVITY_QUERY_PREFIX } from '../api/activity';

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
  if (pathname === '/change-password') return 'Change Password';
  return 'MAMS';
}

export function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const user = useAuth((s) => s.user);
  const location = useLocation();
  const isOnline = useOnlineStatus();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const isCompliant = user?.viewMode === 'compliant';
  const title = pageTitle(location.pathname);
  const { fmtTime } = useTimeDisplay();
  const refreshToken = useAuth((s) => s.refreshToken);
  const clear = useAuth((s) => s.clear);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const onLogout = async() => {
    try{
      if (refreshToken) await authApi.logout(refreshToken);
    } catch{

    } finally{
      clear();
      clearFirstLoginSession();
      qc.removeQueries({ queryKey: ACTIVITY_QUERY_PREFIX });
      navigate('/login');
    }
  };

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
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
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

        {isCompliant && (
          <div className="flex items-center gap-2.5 border-1 border-border pl-3">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center font-bold text-xs text-primary shrink-0">
              {(user?.name ?? '??').split(' ').map((s) => s[0]).slice(0, 2).join('')}
            </div>

            <div className="hidden md:flex flex-col items-end">
              <div className="text-[12px] font-semibold truncate max-w-[120px]">{user?.name}</div>
              <button
                type="button"
                onClick={onLogout}
                className="text-[11px] text-text-muted hover:text-red transition-colors">
                  Sign out
                </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );  
}
