import type { AdminOverviewKpiMetricId, Permission } from '@mams/types';
import {
  ALL_ADMIN_OVERVIEW_KPI_METRICS,
  canAccessKpiMetric,
  filterAllowedKpiMetrics,
  getAdminMetricPickerLabel,
} from '../../../lib/adminOverviewKpiRegistry';

export function AdminOverviewKpiMetricPicker({
  slotIndex,
  currentSlots,
  permissions,
  onSelect,
  onClose,
}: {
  slotIndex: number;
  currentSlots: AdminOverviewKpiMetricId[];
  permissions: Permission[];
  onSelect: (metric: AdminOverviewKpiMetricId) => void;
  onClose: () => void;
}) {
  const allowed = new Set(filterAllowedKpiMetrics(permissions));
  const usedElsewhere = new Set(currentSlots.filter((_, i) => i !== slotIndex));

  return (
    <div
      className="dash-kpi-picker-overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      role="dialog"
      aria-modal
      aria-labelledby="admin-kpi-picker-title"
      onClick={onClose}
    >
      <div
        className="dash-kpi-picker-panel card w-full sm:max-w-sm max-h-[min(85vh,520px)] sm:max-h-[80vh] overflow-hidden flex flex-col rounded-t-2xl sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 pb-2 border-b border-border shrink-0">
          <h2 id="admin-kpi-picker-title" className="text-sm font-bold">
            Choose metric for card {slotIndex + 1}
          </h2>
        </div>
        <ul className="overflow-y-auto p-2 sm:p-3 space-y-1 flex-1">
          {ALL_ADMIN_OVERVIEW_KPI_METRICS.map((id) => {
            const disabled = usedElsewhere.has(id) || !allowed.has(id);
            return (
              <li key={id}>
                <button
                  type="button"
                  className={`dash-kpi-picker-option w-full text-left px-3 py-3 sm:py-2 rounded text-sm transition ${
                    disabled
                      ? 'text-text-subtle cursor-not-allowed opacity-50'
                      : 'hover:bg-surface2 active:bg-surface2 text-text'
                  } ${currentSlots[slotIndex] === id ? 'bg-primary-bg text-primary-on-bg font-semibold' : ''}`}
                  disabled={disabled}
                  onClick={() => {
                    if (!disabled) {
                      onSelect(id);
                      onClose();
                    }
                  }}
                >
                  {getAdminMetricPickerLabel(id)}
                  {!canAccessKpiMetric(id, permissions) && !disabled ? ' (restricted)' : ''}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="p-3 pt-2 border-t border-border shrink-0 safe-area-pb">
          <button type="button" className="btn-outline btn-sm w-full min-h-[44px] sm:min-h-0" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
