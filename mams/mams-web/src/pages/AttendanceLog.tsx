import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { attendanceApi } from '../api/attendance';
import { fmtIstTime, fmtDate } from '../lib/format';
import { PunchCardList } from '../components/attendance/PunchCardList';

type PunchTypeFilter = 'all' | 'IN' | 'OUT' | 'OTHER';

export function AttendanceLog() {
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [punchType, setPunchType] = useState<PunchTypeFilter>('all');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const isLiveMode = !search.trim() && !date && punchType === 'all';

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', 'raw', { search, date, punchType, page, isLiveMode }],
    queryFn: () => {
      if (isLiveMode) {
        return attendanceApi.listRaw({ limit: pageSize }).then((r) => ({
          items: r.items,
          total: r.total,
          page: 1,
          pageSize,
        }));
      }
      return attendanceApi.listRaw({
        search: search.trim() || undefined,
        date: date || undefined,
        punchType: punchType === 'all' ? undefined : punchType,
        page,
        pageSize,
      });
    },
    refetchInterval: isLiveMode ? 5000 : false,
  });

  const hasFilters = !isLiveMode;
  const emptyMessage = hasFilters
    ? 'No punches match your filters.'
    : 'No punches yet. Run the eSSL simulator (scripts/essl-sim.js) to generate some.';

  const clearFilters = () => {
    setSearch('');
    setDate('');
    setPunchType('all');
    setPage(1);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Live Attendance Log</h1>
          <div className="text-sm text-text-muted">
            {isLiveMode
              ? 'Live punches from biometric devices, polled every 5s.'
              : data
                ? `${data.total.toLocaleString()} matching punch${data.total === 1 ? '' : 'es'}`
                : 'Search and filter historical punches.'}
          </div>
        </div>
        {isLiveMode && (
          <span className="px-3 py-1 rounded-full bg-green-bg text-green-dark text-xs font-semibold flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-3 flex-wrap">
        <input
          className="input flex-1 min-w-[200px]"
          placeholder="Search by name, employee code, biometric ID..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <input
          type="date"
          className="input w-full sm:w-auto"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by date"
        />
        <select
          className="input w-full sm:w-auto"
          value={punchType}
          onChange={(e) => {
            setPunchType(e.target.value as PunchTypeFilter);
            setPage(1);
          }}
          aria-label="Punch type"
        >
          <option value="all">All types</option>
          <option value="IN">IN</option>
          <option value="OUT">OUT</option>
          <option value="OTHER">OTHER</option>
        </select>
        {hasFilters && (
          <button type="button" className="btn-outline shrink-0" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      <PunchCardList
        items={data?.items}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
      />

      <div className="card overflow-hidden hidden md:block">
        <div className="tbl-scroll">
          <table className="w-full text-sm">
            <thead className="bg-surface2">
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="px-4 py-3 font-semibold">Time</th>
                <th className="px-4 py-3 font-semibold">Employee</th>
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold hidden lg:table-cell">Department</th>
                <th className="px-4 py-3 font-semibold">Bio ID</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-text-muted">Loading...</td></tr>
              )}
              {!isLoading && data?.items.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-text-muted">{emptyMessage}</td></tr>
              )}
              {data?.items.map((p) => (
                <tr key={p._id} className="hover:bg-surface2/50">
                  <td className="px-4 py-2.5 font-mono text-xs">{fmtIstTime(p.rawTimestamp)}</td>
                  <td className="px-4 py-2.5 font-medium">{p.employeeId?.name ?? '-'}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{p.employeeId?.empCode ?? '-'}</td>
                  <td className="px-4 py-2.5 text-text-muted hidden lg:table-cell">{p.employeeId?.department ?? '-'}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{p.biometricId}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      p.punchType === 'IN' ? 'bg-green-bg text-green-dark' :
                      p.punchType === 'OUT' ? 'bg-amber-bg text-amber' :
                      'bg-surface2 text-text-muted'
                    }`}>{p.punchType}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-text-muted">{fmtDate(p.rawDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {data && data.total > pageSize && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="text-text-muted">
            Page {page} of {Math.ceil(data.total / pageSize)}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setPage((p) => p + 1)}
              disabled={page * pageSize >= data.total}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
