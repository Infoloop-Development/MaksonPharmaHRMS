export function RegularizationPageHeader({ onCreate, canCreate }: { onCreate: () => void; canCreate: boolean }) {
  return (
    <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 className="text-2xl font-bold">Attendance Regularization</h1>
        <div className="text-sm text-text-muted">
          HR-initiated missed-punch corrections. Approved requests insert tagged raw punches and recompute attendance.
        </div>
      </div>
      {canCreate && (
        <button className="btn-primary" onClick={onCreate}>
          + New request
        </button>
      )}
    </div>
  );
}
