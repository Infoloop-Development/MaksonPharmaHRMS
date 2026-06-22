import type { VisitorTab } from './visitorsUtils';

const TABS: { id: VisitorTab; label: string }[] = [
  { id: 'requests', label: 'Visitor Requests' },
  { id: 'forms', label: 'Forms' },
];

export function VisitorsTabBar({
  tab,
  onTabChange,
  canManageForms = false,
  canViewRequests = true,
}: {
  tab: VisitorTab;
  onTabChange: (t: VisitorTab) => void;
  canManageForms?: boolean;
  canViewRequests?: boolean;
}) {
  const visibleTabs = TABS.filter((t) => {
    if (t.id === 'requests') return canViewRequests;
    if (t.id === 'forms') return canManageForms;
    return false;
  });
  const colClass =
    visibleTabs.length === 1 ? 'grid-cols-1' : 'grid-cols-2';

  return (
    <div className="card mb-6 overflow-hidden">
      <div className={`grid ${colClass} md:flex md:flex-wrap border-b border-border`}>
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`flex-1 md:flex-none px-3 md:px-5 py-3 text-sm font-medium text-center border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'tab-link--active border-b-2 -mb-px'
                : 'border-transparent border-b-2 -mb-px text-text-muted hover:text-text hover:bg-surface2'
            }`}
            onClick={() => onTabChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
