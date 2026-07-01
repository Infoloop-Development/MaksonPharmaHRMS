import type { RecycleBinEntityType } from '@mams/types';

const TABS: { value: RecycleBinEntityType | 'all'; label: string; shortLabel?: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'employee', label: 'Employees' },
  { value: 'device', label: 'Devices' },
  { value: 'holiday', label: 'Holidays' },
  { value: 'visitor_form', label: 'Visitor forms', shortLabel: 'Forms' },
];

export function RecycleBinTabBar({
  entityType,
  onEntityTypeChange,
}: {
  entityType: RecycleBinEntityType | 'all';
  onEntityTypeChange: (value: RecycleBinEntityType | 'all') => void;
}) {
  return (
    <div className="card mb-4 overflow-hidden">
      <div
        className="flex gap-0 overflow-x-auto border-b border-border scrollbar-thin"
        role="tablist"
        aria-label="Recycle bin entity types"
      >
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={entityType === tab.value}
            className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              entityType === tab.value
                ? 'tab-link--active border-b-2 -mb-px'
                : 'border-transparent border-b-2 -mb-px text-text-muted hover:text-text hover:bg-surface2'
            }`}
            onClick={() => onEntityTypeChange(tab.value)}
          >
            <span className="md:hidden">{tab.shortLabel ?? tab.label}</span>
            <span className="hidden md:inline">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
