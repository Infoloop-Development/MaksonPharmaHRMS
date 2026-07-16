import type { LeaveTab } from './leaveUtils';

const TABS: { id: LeaveTab; label: string; shortLabel?: string }[] = [
  { id: 'requests', label: 'Requests' },
  { id: 'holidays', label: 'Holidays' },
  { id: 'settings', label: 'Leave Settings', shortLabel: 'Settings' },
];

export function LeaveTabBar({
  tab,
  onTabChange,
  canConfigure = false,
}: {
  tab: LeaveTab;
  onTabChange: (t: LeaveTab) => void;
  canConfigure?: boolean;
}) {
  const visibleTabs = TABS.filter((t) => t.id === 'requests' || canConfigure);
  const colClass = visibleTabs.length === 1 ? 'grid-cols-1' : visibleTabs.length === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className="card mb-6 overflow-hidden">
      <div className={`grid ${colClass} md:flex md:flex-wrap border-b border-border`}>
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            data-tour-id={t.id === 'holidays'? 'leave-holidays-hint': undefined}
            className={`flex-1 md:flex-none px-3 md:px-5 py-3 text-sm font-medium text-center border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'tab-link--active border-b-2 -mb-px'
                : 'border-transparent border-b-2 -mb-px text-text-muted hover:text-text hover:bg-surface2'
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
