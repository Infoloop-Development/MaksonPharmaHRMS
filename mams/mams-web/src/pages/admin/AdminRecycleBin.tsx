import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BULK_SELECTION_MAX,
  RECYCLE_BIN_ENTITY_LABELS,
  RECYCLE_BIN_RETENTION_DAYS,
  canManageRecycleBin,
  type RecycleBinEntityType,
  type RecycleBinItem,
} from '@mams/types';
import { useAuth } from '../../store/auth';
import { recycleBinApi, RECYCLE_BIN_QUERY_KEY } from '../../api/recycleBin';
import { useToast } from '../../components/ui/Toast';
import { TablePagination } from '../../components/ui/TablePagination';
import { BulkConfirmModal } from '../../components/ui/BulkConfirmModal';
import { BulkSelectCheckbox } from '../../components/ui/BulkSelectCheckbox';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import { Badge } from '../../components/ui/Badge';
import { fmtIstDate } from '../../lib/format';
import { RecycleBinTabBar } from '../../components/admin/RecycleBinTabBar';

const TABLE_COLS = 8;

function itemKey(item: RecycleBinItem): string {
  return `${item.entityType}:${item.id}`;
}

function parseItemKey(key: string): { entityType: RecycleBinEntityType; id: string } {
  const colon = key.indexOf(':');
  return {
    entityType: key.slice(0, colon) as RecycleBinEntityType,
    id: key.slice(colon + 1),
  };
}

function daysBadgeTone(days: number): 'green' | 'amber' | 'red' {
  if (days <= 3) return 'red';
  if (days <= 7) return 'amber';
  return 'green';
}

export function AdminRecycleBin() {
  const user = useAuth((s) => s.user);
  const canAccess = canManageRecycleBin(user?.permissions ?? []);
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const bulk = useBulkSelection();

  const [entityType, setEntityType] = useState<RecycleBinEntityType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [restoreTarget, setRestoreTarget] = useState<RecycleBinItem | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<RecycleBinItem | null>(null);
  const [bulkRestoreOpen, setBulkRestoreOpen] = useState(false);
  const [bulkPurgeOpen, setBulkPurgeOpen] = useState(false);

  const pageSize = 50;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
    bulk.clear();
  }, [entityType, debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading, error } = useQuery({
    queryKey: [...RECYCLE_BIN_QUERY_KEY, entityType, debouncedSearch, page],
    queryFn: () =>
      recycleBinApi.list({
        entityType: entityType === 'all' ? undefined : entityType,
        search: debouncedSearch.trim() || undefined,
        page,
        pageSize,
      }),
    enabled: canAccess,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageKeys = useMemo(() => items.map(itemKey), [items]);
  const pageCheck = bulk.pageSelectionState(pageKeys);

  const selectedItems = useMemo(
    () =>
      bulk.ids
        .map(parseItemKey)
        .map(({ entityType: et, id }) => items.find((i) => i.entityType === et && i.id === id))
        .filter(Boolean) as RecycleBinItem[],
    [bulk.ids, items]
  );

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: RECYCLE_BIN_QUERY_KEY });
  };

  const runBulkMutation = async (mode: 'restore' | 'purge') => {
    const body = { items: bulk.ids.map(parseItemKey) };
    const result =
      mode === 'restore' ? await recycleBinApi.restore(body) : await recycleBinApi.purge(body);
    const verb = mode === 'restore' ? 'Restored' : 'Permanently deleted';
    toast(
      `${verb} ${result.succeeded} item${result.succeeded !== 1 ? 's' : ''}${
        result.skipped ? `, ${result.skipped} skipped` : ''
      }`,
      result.succeeded > 0 ? 'success' : 'error'
    );
    invalidate();
    bulk.clear();
    return result;
  };

  if (!canAccess) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Recycle bin</h1>
        <p className="text-sm text-text-muted mt-1">
          Recover or permanently remove soft-deleted records. IT Admin only.
        </p>
      </div>

      <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-text">
        Items remain recoverable for <strong>{RECYCLE_BIN_RETENTION_DAYS} days</strong> after deletion, then are
        permanently removed automatically.
      </div>

      <RecycleBinTabBar entityType={entityType} onEntityTypeChange={setEntityType} />

      <div className="mb-4">
        <input
          type="search"
          className="input w-full max-w-md"
          placeholder="Search by name or identifier…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="mb-4 text-sm text-red">{error instanceof Error ? error.message : 'Failed to load recycle bin'}</div>
      )}

      {bulk.count > 0 && (
        <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <span className="font-medium">
            {bulk.count.toLocaleString()} selected
            {bulk.overLimit && (
              <span className="ml-2 text-red font-normal">(max {BULK_SELECTION_MAX} — deselect some items)</span>
            )}
          </span>
          <div className="flex flex-wrap gap-2 ml-auto">
            <button type="button" className="btn-outline btn-sm" onClick={bulk.clear}>
              Clear selection
            </button>
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={bulk.overLimit}
              onClick={() => setBulkRestoreOpen(true)}
            >
              Restore selected
            </button>
            <button
              type="button"
              className="btn-primary btn-sm bg-red hover:bg-red/90"
              disabled={bulk.overLimit}
              onClick={() => setBulkPurgeOpen(true)}
            >
              Delete permanently
            </button>
          </div>
        </div>
      )}

      <div className="md:hidden space-y-3 mb-4">
        {isLoading && <div className="card p-4 text-center text-text-muted">Loading…</div>}
        {!isLoading && items.length === 0 && (
          <div className="card p-4 text-center text-text-muted">No deleted items in the recycle bin.</div>
        )}
        {items.map((row) => (
          <div key={itemKey(row)} className="card p-4 space-y-2">
            <div className="flex items-start gap-3">
              <BulkSelectCheckbox
                checked={bulk.isSelected(itemKey(row))}
                onChange={() => bulk.toggle(itemKey(row))}
                ariaLabel={`Select ${row.name}`}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{row.name}</div>
                <div className="text-xs text-text-muted">{RECYCLE_BIN_ENTITY_LABELS[row.entityType]}</div>
              </div>
              <Badge tone={daysBadgeTone(row.daysRemaining)}>{row.daysRemaining}d</Badge>
            </div>
            <div className="text-xs text-text-muted grid grid-cols-2 gap-1 pl-8">
              <span>ID: {row.identifier}</span>
              <span>By: {row.deletedBy?.name ?? '—'}</span>
              <span className="col-span-2">Deleted: {fmtIstDate(row.deletedAt)}</span>
            </div>
            <div className="flex gap-2 pl-8">
              <button type="button" className="btn-outline btn-sm flex-1" onClick={() => setRestoreTarget(row)}>
                Restore
              </button>
              <button type="button" className="btn-outline btn-sm flex-1 text-red" onClick={() => setPurgeTarget(row)}>
                Delete permanently
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden hidden md:block">
        <div className="tbl-scroll">
          <table className="w-full text-sm">
            <thead className="bg-surface2">
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="px-4 py-3 w-10">
                  <BulkSelectCheckbox
                    checked={pageCheck.allSelected && pageKeys.length > 0}
                    indeterminate={pageCheck.someSelected}
                    onChange={() => bulk.togglePage(pageKeys)}
                    ariaLabel="Select all items on this page"
                  />
                </th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Identifier</th>
                <th className="px-4 py-3 font-semibold">Deleted by</th>
                <th className="px-4 py-3 font-semibold">Deleted at</th>
                <th className="px-4 py-3 font-semibold">Days left</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr>
                  <td colSpan={TABLE_COLS} className="px-4 py-10 text-center text-text-muted">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={TABLE_COLS} className="px-4 py-10 text-center text-text-muted">
                    No deleted items in the recycle bin.
                  </td>
                </tr>
              )}
              {!isLoading &&
                items.map((row) => (
                  <tr key={itemKey(row)} className="hover:bg-surface2/50">
                    <td className="px-4 py-3">
                      <BulkSelectCheckbox
                        checked={bulk.isSelected(itemKey(row))}
                        onChange={() => bulk.toggle(itemKey(row))}
                        ariaLabel={`Select ${row.name}`}
                      />
                    </td>
                    <td className="px-4 py-3">{RECYCLE_BIN_ENTITY_LABELS[row.entityType]}</td>
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.identifier}</td>
                    <td className="px-4 py-3">{row.deletedBy?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-text-muted">{fmtIstDate(row.deletedAt)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={daysBadgeTone(row.daysRemaining)}>{row.daysRemaining}d</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" className="btn-outline btn-sm" onClick={() => setRestoreTarget(row)}>
                          Restore
                        </button>
                        <button type="button" className="btn-outline btn-sm text-red" onClick={() => setPurgeTarget(row)}>
                          Delete permanently
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <TablePagination
          page={page}
          totalPages={totalPages}
          total={total}
          showTotal
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      )}

      <BulkConfirmModal
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        title="Restore item?"
        description={
          restoreTarget ? (
            <>
              Restore <strong>{restoreTarget.name}</strong> ({RECYCLE_BIN_ENTITY_LABELS[restoreTarget.entityType]})?
            </>
          ) : null
        }
        confirmLabel="Restore"
        onConfirm={async () => {
          if (!restoreTarget) return;
          const result = await recycleBinApi.restore({
            items: [{ entityType: restoreTarget.entityType, id: restoreTarget.id }],
          });
          toast('Item restored', 'success');
          invalidate();
          return result;
        }}
      />

      <BulkConfirmModal
        open={!!purgeTarget}
        onClose={() => setPurgeTarget(null)}
        title="Delete permanently?"
        description={
          purgeTarget ? (
            <>
              Permanently delete <strong>{purgeTarget.name}</strong>? This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete permanently"
        onConfirm={async () => {
          if (!purgeTarget) return;
          const result = await recycleBinApi.purge({
            items: [{ entityType: purgeTarget.entityType, id: purgeTarget.id }],
          });
          toast('Item permanently deleted', 'success');
          invalidate();
          return result;
        }}
      />

      <BulkConfirmModal
        open={bulkRestoreOpen}
        onClose={() => setBulkRestoreOpen(false)}
        title="Restore selected items?"
        description={
          <>
            Restore <strong>{bulk.count}</strong> selected item{bulk.count !== 1 ? 's' : ''}?
          </>
        }
        itemLabels={selectedItems.map((i) => `${RECYCLE_BIN_ENTITY_LABELS[i.entityType]}: ${i.name}`)}
        confirmLabel="Restore selected"
        onConfirm={() => runBulkMutation('restore')}
      />

      <BulkConfirmModal
        open={bulkPurgeOpen}
        onClose={() => setBulkPurgeOpen(false)}
        title="Delete permanently?"
        description={
          <>
            Permanently delete <strong>{bulk.count}</strong> selected item{bulk.count !== 1 ? 's' : ''}? This cannot be
            undone.
          </>
        }
        itemLabels={selectedItems.map((i) => `${RECYCLE_BIN_ENTITY_LABELS[i.entityType]}: ${i.name}`)}
        confirmLabel="Delete permanently"
        onConfirm={() => runBulkMutation('purge')}
      />
    </div>
  );
}
