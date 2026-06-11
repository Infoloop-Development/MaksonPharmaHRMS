export function LeaveReadOnlyBanner() {
  return (
    <div className="mb-4 p-3 rounded-md bg-amber-bg border border-amber/30 text-sm text-text">
      <strong>Read-only view.</strong> You can browse leave requests but cannot submit, approve, or configure leave settings.
      Ask an admin to grant <em>Submit leave</em>, <em>Approve leave</em>, or <em>Full leave admin</em> in Settings → Users.
    </div>
  );
}
