import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { goLiveApi } from '../../api/goLive';
import { ReadinessEmployeeCardList } from './ReadinessEmployeeCardList';

export function GoLiveReadinessPanel() {
  const [days, setDays] = useState(7);

  const { data, isLoading } = useQuery({
    queryKey: ['go-live', 'readiness', days],
    queryFn: () => goLiveApi.readiness(days),
    refetchInterval: 120_000,
  });

  return (
    <div className="card p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold">Go-live readiness</h2>
          <p className="text-xs text-text-muted mt-1">
            Active employees with no ingested punch in the selected window — may need device enrollment or Biometric ID
            alignment.
          </p>
        </div>
        <label className="text-xs text-text-muted">
          No punch within
          <select
            className="input block mt-1 text-sm"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={3}>3 days</option>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
          </select>
        </label>
      </div>

      {isLoading && <div className="text-sm text-text-muted">Loading…</div>}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
            <div className="rounded bg-surface2 p-2">
              <div className="text-[10px] uppercase text-text-muted">Active</div>
              <div className="text-lg font-bold">{data.totalActive}</div>
            </div>
            <div className="rounded bg-green-bg/50 p-2">
              <div className="text-[10px] uppercase text-green-dark">With punch</div>
              <div className="text-lg font-bold text-green-dark">{data.withRecentPunch}</div>
            </div>
            <div className="rounded bg-amber-bg/50 p-2">
              <div className="text-[10px] uppercase text-amber">No punch</div>
              <div className="text-lg font-bold text-amber">{data.withoutRecentPunch}</div>
            </div>
          </div>

          {data.employeesWithoutPunch.length > 0 && (
            <>
            <ReadinessEmployeeCardList items={data.employeesWithoutPunch} />
            <div className="max-h-48 overflow-y-auto border border-border rounded hidden md:block">
              <table className="w-full text-xs">
                <thead className="bg-surface2 sticky top-0">
                  <tr className="text-left text-text-muted">
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Biometric ID</th>
                    <th className="px-3 py-2">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.employeesWithoutPunch.map((e) => (
                    <tr key={e.id}>
                      <td className="px-3 py-2 font-mono">{e.empCode}</td>
                      <td className="px-3 py-2">
                        <Link to={`/employees/${e.id}`} className="text-primary hover:underline">
                          {e.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2 font-mono">{e.biometricId}</td>
                      <td className="px-3 py-2 text-text-muted">{e.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
          {data.withoutRecentPunch > data.employeesWithoutPunch.length && (
            <p className="text-[11px] text-text-subtle">
              Showing first {data.employeesWithoutPunch.length} of {data.withoutRecentPunch} employees without punches.
            </p>
          )}
        </>
      )}
    </div>
  );
}
