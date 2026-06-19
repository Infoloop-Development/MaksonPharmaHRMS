import type { FeatureFlagCategory } from '@mams/types';
import { FEATURE_FLAG_CATEGORIES } from '@mams/types';
import type { FeatureFlagStatusFilter } from '../../../lib/featureFlagCatalog';
import { MobileFilterBar } from '../../ui/MobileFilterBar';
import { Field, Input } from '../../ui/Field';

function SegmentGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5 min-w-0">
      <div className="text-xs font-bold uppercase text-text-muted">{label}</div>
      {children}
    </div>
  );
}

export function FeatureFlagsToolbar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  status,
  onStatusChange,
  onClear,
  activeCount,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  category: FeatureFlagCategory | 'all';
  onCategoryChange: (v: FeatureFlagCategory | 'all') => void;
  status: FeatureFlagStatusFilter;
  onStatusChange: (v: FeatureFlagStatusFilter) => void;
  onClear: () => void;
  activeCount: number;
}) {
  const statusSegment = (
    <SegmentGroup label="Status">
      <div className="dash-layout-segment" role="group" aria-label="Filter by status">
        {(['all', 'on', 'off'] as FeatureFlagStatusFilter[]).map((s) => (
          <button
            key={s}
            type="button"
            className={`dash-layout-segment-btn capitalize ${
              status === s ? 'dash-layout-segment-btn--active' : ''
            }`}
            onClick={() => onStatusChange(s)}
          >
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>
    </SegmentGroup>
  );

  const categorySegment = (
    <SegmentGroup label="Category">
      <div className="dash-layout-segment flex-wrap" role="group" aria-label="Filter by category">
        <button
          type="button"
          className={`dash-layout-segment-btn ${category === 'all' ? 'dash-layout-segment-btn--active' : ''}`}
          onClick={() => onCategoryChange('all')}
        >
          All
        </button>
        {FEATURE_FLAG_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`dash-layout-segment-btn ${category === cat ? 'dash-layout-segment-btn--active' : ''}`}
            onClick={() => onCategoryChange(cat)}
          >
            {cat}
          </button>
        ))}
      </div>
    </SegmentGroup>
  );

  return (
    <MobileFilterBar
      activeCount={activeCount}
      onClear={onClear}
      desktopClassName="hidden md:flex md:flex-col gap-3"
      search={
        <Field label="Search">
          <Input
            placeholder="Flags, env keys, areas…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search feature flags"
          />
        </Field>
      }
    >
      {statusSegment}
      {categorySegment}
    </MobileFilterBar>
  );
}
