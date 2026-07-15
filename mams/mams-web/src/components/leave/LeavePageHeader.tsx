import type { ReactNode } from 'react';

export function LeavePageHeader({
  canApply,
  onAddLeave,
  tourButton,
}: {
  canApply: boolean;
  onAddLeave: () => void;
  tourButton?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-center justify-between flex-wrap gap-3" data-tour-id="leave-header">
      <div>
        <h1 className="text-2xl font-bold">Leave Management</h1>
        <p className="text-sm text-text-muted mt-1">
          HR leave requests, quotas, and holiday calendar. Employee self-service is planned for a later release.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {tourButton}
        {canApply && (
          <button
            type="button"
            className="btn-primary h-10 min-h-10 whitespace-nowrap"
            data-tour-id="leave-apply"
            onClick={onAddLeave}
          >
            + Add Leave
          </button>
        )}
      </div>
    </div>
  );
}