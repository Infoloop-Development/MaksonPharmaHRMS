import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FeatureFlagCategory, FeatureFlagId, FeatureFlagState } from '@mams/types';
import { FEATURE_FLAG_CATEGORIES } from '@mams/types';
import { adminApi } from '../../../api/admin';
import { ORG_ACTIVITY_QUERY_PREFIX } from '../../../api/activity';
import { useToast } from '../../ui/Toast';
import { Badge } from '../../ui/Badge';
import {
  enrichFeatureFlagsResponse,
  filterFeatureFlags,
  groupFlagsByCategory,
  type FeatureFlagStatusFilter,
} from '../../../lib/featureFlagCatalog';
import { AdminSectionCard } from '../../ui/AdminSectionCard';
import { FeatureFlagConfirmModal } from './FeatureFlagConfirmModal';
import { FeatureFlagRow } from './FeatureFlagRow';
import { FeatureFlagsAuditPanel } from './FeatureFlagsAuditPanel';
import { FeatureFlagsDeployPanel } from './FeatureFlagsDeployPanel';
import { FeatureFlagsSummary } from './FeatureFlagsSummary';
import { FeatureFlagsToolbar } from './FeatureFlagsToolbar';

type PendingToggle = { flag: FeatureFlagState; nextEnabled: boolean };

function countActiveFilters(
  search: string,
  category: FeatureFlagCategory | 'all',
  status: FeatureFlagStatusFilter
): number {
  let n = 0;
  if (search.trim()) n += 1;
  if (category !== 'all') n += 1;
  if (status !== 'all') n += 1;
  return n;
}

export function FeatureFlagsPage() {
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<FeatureFlagCategory | 'all'>('all');
  const [status, setStatus] = useState<FeatureFlagStatusFilter>('all');
  const [pending, setPending] = useState<PendingToggle | null>(null);

  const { data: raw, isLoading } = useQuery({
    queryKey: ['admin', 'feature-flags'],
    queryFn: adminApi.getFeatureFlags,
    select: enrichFeatureFlagsResponse,
  });

  const mutation = useMutation({
    mutationFn: adminApi.patchFeatureFlags,
    onSuccess: (res) => {
      toast('Feature flag updated', 'success');
      qc.setQueryData(['admin', 'feature-flags'], enrichFeatureFlagsResponse(res));
      qc.invalidateQueries({ queryKey: ORG_ACTIVITY_QUERY_PREFIX });
      qc.invalidateQueries({ queryKey: ['settings'] });
      setPending(null);
    },
    onError: (e: unknown) => {
      toast(e instanceof Error ? e.message : 'Update failed', 'error');
      setPending(null);
    },
  });

  const filtered = useMemo(
    () => (raw ? filterFeatureFlags(raw.flags, { search, category, status }) : []),
    [raw, search, category, status]
  );
  const grouped = useMemo(() => groupFlagsByCategory(filtered), [filtered]);
  const activeCount = countActiveFilters(search, category, status);

  const requestToggle = (flag: FeatureFlagState, nextEnabled: boolean) => {
    if (flag.riskLevel === 'high') {
      setPending({ flag, nextEnabled });
      return;
    }
    mutation.mutate({ flagId: flag.id as FeatureFlagId, enabled: nextEnabled });
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('all');
    setStatus('all');
  };

  if (isLoading || !raw) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-surface2 rounded animate-pulse" />
        <div className="dash-stat-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="dash-stat-card h-24 animate-pulse bg-surface2" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Feature flags</h1>
        <p className="text-sm text-text-muted mt-1">
          Org-wide runtime controls for security, HR engine, demo modules, and compliance exports.
        </p>
        {raw.lastUpdated && (
          <p className="text-xs text-text-subtle mt-2">
            Last runtime flag update: {new Date(raw.lastUpdated.at).toLocaleString()}
            {raw.lastUpdated.byName ? ` by ${raw.lastUpdated.byName}` : ''}
          </p>
        )}
      </div>

      <FeatureFlagsSummary summary={raw.summary} />

      <FeatureFlagsToolbar
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        status={status}
        onStatusChange={setStatus}
        onClear={clearFilters}
        activeCount={activeCount}
      />

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-sm text-text-muted settings-layout__full">
          No flags match your filters.{' '}
          {activeCount > 0 && (
            <button type="button" className="text-primary underline" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="settings-layout">
          {FEATURE_FLAG_CATEGORIES.map((cat) => {
            const items = grouped[cat];
            if (!items.length) return null;
            return (
              <div key={cat} className="settings-layout__full settings-layout__cell">
                <AdminSectionCard
                  title={cat}
                  headerRight={<Badge tone="blue">{items.length}</Badge>}
                >
                  {items.map((flag) => (
                    <FeatureFlagRow
                      key={flag.id}
                      flag={flag}
                      busy={mutation.isPending}
                      onToggle={(next) => requestToggle(flag, next)}
                    />
                  ))}
                </AdminSectionCard>
              </div>
            );
          })}

          <div className="settings-layout__full settings-layout__cell">
            <FeatureFlagsAuditPanel />
          </div>
          <div className="settings-layout__full settings-layout__cell">
            <FeatureFlagsDeployPanel deploySnippet={raw.deploySnippet} />
          </div>
        </div>
      )}

      {pending && (
        <FeatureFlagConfirmModal
          flag={pending.flag}
          nextEnabled={pending.nextEnabled}
          busy={mutation.isPending}
          onClose={() => setPending(null)}
          onConfirm={() =>
            mutation.mutate({ flagId: pending.flag.id, enabled: pending.nextEnabled })
          }
        />
      )}
    </div>
  );
}
