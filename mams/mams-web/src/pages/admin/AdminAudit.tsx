import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { activityApi, ORG_ACTIVITY_QUERY_PREFIX } from '../../api/activity';
import { adminApi } from '../../api/admin';
import { usersApi } from '../../api/users';
import { AuditLogActiveFilters, AuditLogResults } from '../../components/activity/AuditLogResults';
import { AuditLogTabBar } from '../../components/activity/AuditLogTabBar';
import { SearchableUserSelect } from '../../components/ui/SearchableUserSelect';
import { useToast } from '../../components/ui/Toast';
import type { AuditLogCategory, Role } from '@mams/types';
import { ROLE_LABELS } from '@mams/types';

const PAGE_SIZE = 50;

export function AdminAudit() {
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('');
  const [category, setCategory] = useState<AuditLogCategory>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const toast = useToast((s) => s.push);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: users } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });

  const { data, isLoading } = useQuery({
    queryKey: [...ORG_ACTIVITY_QUERY_PREFIX, page, userId, role, category, debouncedSearch],
    queryFn: () =>
      activityApi.listOrg({
        page,
        pageSize: PAGE_SIZE,
        userId: userId || undefined,
        role: role || undefined,
        category: category === 'all' ? undefined : category,
        search: debouncedSearch.trim() || undefined,
      }),
  });

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectedUser = users?.items.find((u) => u._id === userId);

  const resetPage = () => setPage(1);

  const onExportExcel = async () => {
    setExporting(true);
    try {
      await adminApi.downloadTableXlsx('audit', {
        search: debouncedSearch.trim() || undefined,
        role: role || undefined,
        category: category !== 'all' ? category : undefined,
        userId: userId || undefined,
      });
      toast('Excel download started', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Audit log</h1>
          <p className="text-sm text-text-muted mt-1">Organization-wide activity across all users.</p>
        </div>
        <button type="button" className="btn-outline btn-sm" onClick={() => void onExportExcel()} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export Excel'}
        </button>
      </div>

      <AuditLogTabBar
        category={category}
        onCategoryChange={(next) => {
          setCategory(next);
          resetPage();
        }}
      />

      <div className="card p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="text-sm sm:col-span-1">
          <span className="label block mb-1">Search</span>
          <input
            className="input"
            type="search"
            value={search}
            placeholder="Search events…"
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
          />
        </label>
        <label className="text-sm sm:col-span-1">
          <span className="label block mb-1">User</span>
          <SearchableUserSelect
            value={userId}
            users={users?.items}
            onChange={(id) => {
              setUserId(id);
              resetPage();
            }}
          />
        </label>
        <label className="text-sm sm:col-span-1">
          <span className="label block mb-1">Role</span>
          <select
            className="input"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              resetPage();
            }}
          >
            <option value="">All roles</option>
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="card p-4">
        <AuditLogActiveFilters
          filters={{
            category,
            userId,
            userName: selectedUser?.name,
            role,
            search,
          }}
          onClearCategory={() => {
            setCategory('all');
            resetPage();
          }}
          onClearUser={() => {
            setUserId('');
            resetPage();
          }}
          onClearRole={() => {
            setRole('');
            resetPage();
          }}
          onClearSearch={() => {
            setSearch('');
            resetPage();
          }}
        />

        <AuditLogResults items={data?.items} isLoading={isLoading} />

        {total > PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-text-muted">
              Page {page} of {pageCount} ({total} events)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-outline btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn-outline btn-sm"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
