import type { AdminOverviewTableConfig } from '@mams/types';
import { ADMIN_OVERVIEW_TABLE_COLUMNS } from '@mams/types';
import { kindLabel } from '../../../lib/adminOverviewTableUtils';
import { EMPTY_CELL } from '../../../lib/format';

function cellText(col: string, row: Record<string, unknown>): string {
  if (col === 'occurredAt' && row.occurredAt) return new Date(String(row.occurredAt)).toLocaleString();
  if (col === 'lastLogin' && row.lastLogin) return new Date(String(row.lastLogin)).toLocaleString();
  if (col === 'lastPing' && row.lastPing) return new Date(String(row.lastPing)).toLocaleString();
  if (col === 'active' || col === 'online') return row[col] ? 'Yes' : 'No';
  const val = row[col];
  if (val == null || val === '') return EMPTY_CELL;
  return String(val);
}

export function AdminOverviewGenericCardList({
  config,
  rows,
  isInitialLoad,
  isRefreshing,
}: {
  config: AdminOverviewTableConfig;
  rows: Record<string, unknown>[];
  isInitialLoad: boolean;
  isRefreshing: boolean;
}) {
  const columns = ADMIN_OVERVIEW_TABLE_COLUMNS[config.kind].filter((c) => config.columns.includes(c.id));
  const titleCol = columns.find((c) => c.id === 'name') ?? columns[0];

  if (isInitialLoad) {
    return <div className="px-4 py-8 text-center text-text-subtle text-sm md:hidden">Loading…</div>;
  }
  if (rows.length === 0) {
    return <div className="px-4 py-8 text-center text-text-subtle text-sm md:hidden">No records found.</div>;
  }

  return (
    <div
      className={`space-y-3 px-4 pb-4 md:hidden ${isRefreshing ? 'opacity-60 transition-opacity duration-150' : ''}`}
    >
      {rows.map((row, i) => (
        <div key={String(row.id ?? i)} className="card p-4">
          {titleCol && (
            <div className="font-semibold text-text mb-2">{cellText(titleCol.id, row)}</div>
          )}
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            {columns
              .filter((c) => c.id !== titleCol?.id)
              .map((c) => (
                <div key={c.id}>
                  <dt className="text-text-subtle uppercase tracking-wider">{c.label}</dt>
                  <dd className={c.id.includes('Code') || c.id.includes('At') ? 'dash-time' : ''}>
                    {cellText(c.id, row)}
                  </dd>
                </div>
              ))}
          </dl>
        </div>
      ))}
      <p className="text-[10px] text-text-subtle text-center">{kindLabel(config.kind)} list</p>
    </div>
  );
}
