import { AUDIT_LOG_CATEGORIES, type AuditLogCategory } from '@mams/types';

export function AuditLogTabBar({
  category,
  onCategoryChange,
}: {
  category: AuditLogCategory;
  onCategoryChange: (category: AuditLogCategory) => void;
}) {
  return (
    <div className="card mb-4 overflow-hidden">
      <div
        className="flex gap-0 overflow-x-auto border-b border-border scrollbar-thin"
        role="tablist"
        aria-label="Audit event categories"
      >
        {AUDIT_LOG_CATEGORIES.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={category === tab.id}
            className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              category === tab.id
                ? 'tab-link--active border-b-2 -mb-px'
                : 'border-transparent border-b-2 -mb-px text-text-muted hover:text-text hover:bg-surface2'
            }`}
            onClick={() => onCategoryChange(tab.id)}
          >
            <span className="md:hidden">{tab.shortLabel ?? tab.label}</span>
            <span className="hidden md:inline">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
