export function LeavePageHeader({
  canApply,
  onAddLeave,
}: {
  canApply: boolean;
  onAddLeave: () => void;
}) {
  return (
    <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 className="text-2xl font-bold">Leave Management</h1>
        <p className="text-sm text-text-muted mt-1">
          HR leave requests, quotas, and holiday calendar. Employee self-service is planned for a later release.
        </p>
      </div>
      {canApply && (
        <button type="button" className="btn-primary" onClick={onAddLeave}>
          + Add Leave
        </button>
      )}
    </div>
  );
}
