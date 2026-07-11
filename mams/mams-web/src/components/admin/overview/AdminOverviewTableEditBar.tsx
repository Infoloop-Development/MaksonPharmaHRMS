import type { AdminOverviewTableKind } from '@mams/types';
import { TABLE_KIND_LABELS } from '../../../lib/adminOverviewTableUtils';

const DASH_SELECT =
  'px-3 py-2 border-[1.5px] border-border rounded-md text-xs bg-surface2 outline-none min-w-[180px] chevron-select';

export function AdminOverviewTableEditBar({
  kind,
  allowedKinds,
  onKindChange,
  onChooseColumns,
}: {
  kind: AdminOverviewTableKind;
  allowedKinds: AdminOverviewTableKind[];
  onKindChange: (kind: AdminOverviewTableKind) => void;
  onChooseColumns: () => void;
}) {
  return (
    <div className="card p-4 mb-3 border-2 border-primary/25 bg-primary-bg/20" data-tour-id="admin-overview-table-edit">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 flex-wrap">
        <div className="min-w-[200px]">
          <label htmlFor="admin-table-kind" className="text-xs font-semibold uppercase text-text-muted block mb-1.5">
            Table dataset
          </label>
          <select
            id="admin-table-kind"
            data-tour-id="admin-table-kind"
            className={DASH_SELECT}
            value={kind}
            onChange={(e) => onKindChange(e.target.value as AdminOverviewTableKind)}
          >
            {allowedKinds.map((k) => (
              <option key={k} value={k}>
                {TABLE_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="btn-outline btn-sm" onClick={onChooseColumns} data-tour-id="admin-overview-choose-columns">
          Choose columns
        </button>
        <p className="text-xs text-text-muted sm:ml-auto sm:max-w-xs">
          Changes preview below; click <strong>Save table</strong> in the toolbar when done.
        </p>
      </div>
    </div>
  );
}
