import type { DashboardLayoutRow, TablePosition } from '@mams/types';
import { getTablePosition, setTablePosition } from '../../lib/dashboardLayout';

export function DashboardLayoutGuide({
  rows,
  onRowsChange,
}: {
  rows: DashboardLayoutRow[];
  onRowsChange: (rows: DashboardLayoutRow[]) => void;
}) {
  const tablePosition = getTablePosition(rows);

  const applyPreset = (position: TablePosition) => {
    onRowsChange(setTablePosition(rows, position));
  };

  return (
    <div className="dash-layout-guide">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-text-muted min-w-0 flex-1">
          Drag Bar ↔ Donut to swap charts. Drag table onto a chart to move it top or bottom. Table
          is always full width. Save to apply.
        </p>
        <div className="dash-layout-segment shrink-0" role="group" aria-label="Layout preset">
          <button
            type="button"
            className={`dash-layout-segment-btn ${tablePosition === 'bottom' ? 'dash-layout-segment-btn--active' : ''}`}
            onClick={() => applyPreset('bottom')}
          >
            Charts on top
          </button>
          <button
            type="button"
            className={`dash-layout-segment-btn ${tablePosition === 'top' ? 'dash-layout-segment-btn--active' : ''}`}
            onClick={() => applyPreset('top')}
          >
            Table on top
          </button>
        </div>
      </div>
    </div>
  );
}
