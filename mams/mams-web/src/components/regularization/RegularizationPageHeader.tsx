import type { ReactNode } from 'react';

export function RegularizationPageHeader({
  onCreate,
  canCreate,
  tourButton,
}: {
  onCreate: () => void;
  canCreate: boolean;
  tourButton?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-center justify-between flex-wrap gap-3" data-tour-id="regularization-header">
      <div>
        <h1 className="text-2xl font-bold">Attendance Regularization</h1>
        <div className="text-sm text-text-muted">
          HR-initiated missed-punch corrections. Approved requests insert tagged raw punches and recompute attendance.
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {tourButton}
        {canCreate && (
          <button
            type="button"
            className="btn-primary h-10 min-h-10 whitespace-nowrap"
            data-tour-id="regularization-create"
            onClick={onCreate}
          >
            + New request
          </button>
        )}
      </div>
    </div>
  );
}
