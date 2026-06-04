import { useEffect, useState } from 'react';
import { useAuth } from '../store/auth';

export function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const user = useAuth((s) => s.user);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const ist = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);

  const isCompliant = user?.viewMode === 'compliant';
  const badgeFull = isCompliant ? 'COMPLIANT VIEW (8-hour)' : 'REAL VIEW (12-hour)';
  const badgeShort = isCompliant ? 'COMPLIANT' : 'REAL';

  return (
    <header className="min-h-16 bg-surface border-b border-border flex items-center justify-between gap-2 px-4 md:px-7 py-2 sticky top-0 z-10 flex-wrap">
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
          <h2 className="text-base font-bold">MAMS</h2>
          <div className="text-[11px] text-text-subtle truncate max-w-[200px] sm:max-w-none">{ist} IST</div>
        </div>
      </div>
      <span
        title={badgeFull}
        className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-full shrink-0 ${
          isCompliant ? 'bg-amber-bg text-amber' : 'bg-primary-bg text-primary'
        }`}
      >
        <span className="sm:hidden">{badgeShort}</span>
        <span className="hidden sm:inline">{badgeFull}</span>
      </span>
    </header>
  );
}
