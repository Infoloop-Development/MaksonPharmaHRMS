import type { LeaveTab } from './leaveUtils';

const TABS: { id: LeaveTab; label: string; shortLabel?: string }[] = [
  { id: 'requests', label: 'Requests' },
  { id: 'holidays', label: 'Holidays' },
  { id: 'settings', label: 'Leave Settings', shortLabel: 'Settings' },
];

export function LeaveTabBar({ tab, onTabChange }: { tab: LeaveTab; onTabChange: (t: LeaveTab) => void }) {
  return (
    <div className="card mb-6 overflow-hidden">
      <div className="grid grid-cols-3 md:flex md:flex-wrap border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`flex-1 md:flex-none px-3 md:px-5 py-3 text-sm font-medium text-center border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-primary text-primary bg-primary-bg/30'
                : 'border-transparent text-text-muted hover:text-text hover:bg-surface2'
            }`}
            onClick={() => onTabChange(t.id)}
          >
            <span className="md:hidden">{t.shortLabel ?? t.label}</span>
            <span className="hidden md:inline">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
