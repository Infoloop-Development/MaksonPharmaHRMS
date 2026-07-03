import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BUG_REPORT_SEVERITY_LABELS,
  canManageBugReports,
  type BugReportSeverity,
  type BugReportStatus,
} from '@mams/types';
import { useAuth } from '../../store/auth';
import { adminBugReportingApi, BUG_REPORTING_QUERY_KEY } from '../../api/adminBugReporting';
import { BugReportingTabBar, statusLabel } from '../../components/admin/BugReportingTabBar';
import { Badge } from '../../components/ui/Badge';
import { TablePagination } from '../../components/ui/TablePagination';
import { SortableTh } from '../../components/ui/SortableTh';
import { fmtIstDate } from '../../lib/format';
import { nextSortState, sortArrowFor, type SortDir } from '../../lib/tableSort';

function severityTone(severity: BugReportSeverity): 'green' | 'amber' | 'red' | 'blue' {
  if (severity === 'critical') return 'red';
  if (severity === 'high') return 'amber';
  if (severity === 'medium') return 'blue';
  return 'green';
}

export function AdminBugReporting() {
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const canAccess = canManageBugReports(user?.permissions ?? []);

  const [status, setStatus] = useState<BugReportStatus | 'all'>('all');
  const [severity, setSeverity] = useState<BugReportSeverity | ''>('');
  const [module, setModule] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'createdAt' | 'severity' | 'status' | 'module' | 'title'>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const pageSize = 50;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [status, severity, module, debouncedSearch]);

  const { data: modulesData } = useQuery({
    queryKey: [...BUG_REPORTING_QUERY_KEY, 'modules'],
    queryFn: () => adminBugReportingApi.modules(),
    enabled: canAccess,
  });

  const { data, isLoading } = useQuery({
    queryKey: [...BUG_REPORTING_QUERY_KEY, status, severity, module, debouncedSearch, page, sortBy, sortDir],
    queryFn: () =>
      adminBugReportingApi.list({
        page,
        pageSize,
        status: status === 'all' ? undefined : status,
        severity: severity || undefined,
        module: module || undefined,
        search: debouncedSearch.trim() || undefined,
        sortBy,
        sortDir,
      }),
    enabled: canAccess,
  });

  if (!canAccess) return <Navigate to="/admin" replace />;

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const items = data?.items ?? [];

  const toggleSort = (col: string) => {
    const next = nextSortState(col, { col: sortBy, dir: sortDir }, { col: 'createdAt', dir: 'desc' });
    setSortBy((next.col ?? 'createdAt') as typeof sortBy);
    setSortDir(next.dir);
    setPage(1);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Bug reporting</h1>
        <p className="text-sm text-text-muted mt-1">Review user-submitted bug reports. IT Admin only.</p>
      </div>

      <BugReportingTabBar status={status} onStatusChange={setStatus} />

      <div className="card p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-semibold text-text-muted block mb-1">Search title</label>
          <input
            type="search"
            className="input w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-text-muted block mb-1">Module</label>
          <select className="input w-full" value={module} onChange={(e) => setModule(e.target.value)}>
            <option value="">All modules</option>
            {(modulesData?.modules ?? []).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-text-muted block mb-1">Severity</label>
          <select className="input w-full" value={severity} onChange={(e) => setSeverity(e.target.value as BugReportSeverity | '')}>
            <option value="">All severities</option>
            {(Object.keys(BUG_REPORT_SEVERITY_LABELS) as BugReportSeverity[]).map((s) => (
              <option key={s} value={s}>
                {BUG_REPORT_SEVERITY_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden hidden md:block">
        <div className="tbl-scroll">
          <table className="w-full text-sm">
            <thead className="bg-surface2">
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                <SortableTh label="Title" sortKey="title" activeCol={sortBy} sortArrow={(c) => sortArrowFor(c, sortBy, sortDir)} onSort={toggleSort} />
                <th className="px-4 py-3 font-semibold">Video</th>
                <SortableTh label="Module" sortKey="module" activeCol={sortBy} sortArrow={(c) => sortArrowFor(c, sortBy, sortDir)} onSort={toggleSort} />
                <SortableTh label="Severity" sortKey="severity" activeCol={sortBy} sortArrow={(c) => sortArrowFor(c, sortBy, sortDir)} onSort={toggleSort} />
                <SortableTh label="Status" sortKey="status" activeCol={sortBy} sortArrow={(c) => sortArrowFor(c, sortBy, sortDir)} onSort={toggleSort} />
                <th className="px-4 py-3 font-semibold">Reporter</th>
                <SortableTh label="Reported" sortKey="createdAt" activeCol={sortBy} sortArrow={(c) => sortArrowFor(c, sortBy, sortDir)} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-text-muted">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-text-muted">
                    No bug reports found.
                  </td>
                </tr>
              )}
              {items.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-surface2/50 cursor-pointer"
                  onClick={() => navigate(`/admin/bug-reporting/${row.id}`)}
                >
                  <td className="px-4 py-3 font-medium max-w-xs truncate">{row.title}</td>
                  <td className="px-4 py-3 text-xs">{row.hasVideo ? 'Yes' : '—'}</td>
                  <td className="px-4 py-3 text-xs">{row.module}</td>
                  <td className="px-4 py-3">
                    <Badge tone={severityTone(row.severity)}>{BUG_REPORT_SEVERITY_LABELS[row.severity]}</Badge>
                  </td>
                  <td className="px-4 py-3">{statusLabel(row.status)}</td>
                  <td className="px-4 py-3 text-xs">{row.reporter.name}</td>
                  <td className="px-4 py-3 text-xs text-text-muted">{fmtIstDate(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md:hidden space-y-3">
        {items.map((row) => (
          <button
            key={row.id}
            type="button"
            className="card p-4 w-full text-left"
            onClick={() => navigate(`/admin/bug-reporting/${row.id}`)}
          >
            <div className="font-medium">{row.title}</div>
            <div className="text-xs text-text-muted mt-1">
              {row.module} · {row.reporter.name}
              {row.hasVideo ? ' · Video' : ''}
            </div>
            <div className="flex gap-2 mt-2">
              <Badge tone={severityTone(row.severity)}>{BUG_REPORT_SEVERITY_LABELS[row.severity]}</Badge>
              <span className="text-xs">{statusLabel(row.status)}</span>
            </div>
          </button>
        ))}
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
    </div>
  );
}
