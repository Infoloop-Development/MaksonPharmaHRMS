import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { goLiveApi } from '../../api/goLive';
import { fmtIstDate, fmtIstTime } from '../../lib/format';

export function OrphanPunchesPanel() {
  const [page, setPage] = useState(1);
  const [sinceDays, setSinceDays] = useState(14);
  const pageSize = 15;

  const { data, isLoading, error } = useQuery({
    queryKey: ['go-live', 'orphan-punches', { page, sinceDays }],
    queryFn: () => goLiveApi.orphanPunches({ page, pageSize, sinceDays }),
    refetchInterval: 60_000,
  });

  return (
    <div className="card p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold">Unmapped punches</h2>
          <p className="text-xs text-text-muted mt-1 max-w-xl">
            Device sent a user ID with no matching employee Biometric ID. These events are audit-logged only — they do
            not appear in Attendance Log. Add or fix the employee, then have them punch again.
          </p>
        </div>
        <label className="text-xs text-text-muted">
          Last
          <select
            className="input block mt-1 text-sm"
            value={sinceDays}
            onChange={(e) => {
              setSinceDays(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
        </label>
      </div>

      {isLoading && <div className="text-sm text-text-muted py-4">Loading…</div>}
      {error && <div className="text-sm text-red py-4">Could not load unmapped punches.</div>}

      {data && data.total === 0 && (
        <div className="text-sm text-text-muted py-2 bg-green-bg/50 text-green-dark px-3 rounded">
          No unmapped punches in the selected period.
        </div>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="space-y-2 md:hidden">
            {data.items.map((row) => (
              <div key={row.id} className="border border-border rounded p-3 text-xs space-y-2">
                <div className="font-mono text-text-muted">
                  {fmtIstDate(row.occurredAt)} {fmtIstTime(row.occurredAt)}
                </div>
                <div>
                  <span className="text-text-subtle uppercase tracking-wider">Device </span>
                  <span className="font-mono">{row.deviceSerial ?? '—'}</span>
                  {row.deviceCode && <span className="text-text-muted"> ({row.deviceCode})</span>}
                </div>
                <div>
                  <span className="text-text-subtle uppercase tracking-wider block mb-1">Unknown IDs</span>
                  <div className="flex flex-wrap gap-1">
                    {row.orphanIds.map((id) => (
                      <span key={id} className="font-mono bg-amber-bg text-amber px-1.5 py-0.5 rounded">
                        {id}
                      </span>
                    ))}
                  </div>
                </div>
                {row.sourceIp && <div className="font-mono text-text-subtle">IP {row.sourceIp}</div>}
              </div>
            ))}
          </div>
          <div className="hidden md:block tbl-scroll border border-border rounded">
            <table className="w-full text-xs">
              <thead className="bg-surface2">
                <tr className="text-left text-text-muted uppercase tracking-wider">
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Device</th>
                  <th className="px-3 py-2">Unknown IDs</th>
                  <th className="px-3 py-2">Source IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {fmtIstDate(row.occurredAt)} {fmtIstTime(row.occurredAt)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-mono">{row.deviceSerial ?? '—'}</div>
                      <div className="text-text-subtle">{row.deviceCode ?? ''}</div>
                    </td>
                    <td className="px-3 py-2">
                      {row.orphanIds.map((id) => (
                        <span
                          key={id}
                          className="inline-block font-mono bg-amber-bg text-amber px-1.5 py-0.5 rounded mr-1 mb-1"
                        >
                          {id}
                        </span>
                      ))}
                    </td>
                    <td className="px-3 py-2 font-mono text-text-muted">{row.sourceIp ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-text-muted">
            <span>
              {data.total} event{data.total === 1 ? '' : 's'} — search{' '}
              <Link to="/employees" className="text-primary hover:underline">
                Employees
              </Link>{' '}
              by Biometric ID to fix mapping
            </span>
            {data.total > pageSize && (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-outline py-1 px-2"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="btn-outline py-1 px-2"
                  disabled={page * pageSize >= data.total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
