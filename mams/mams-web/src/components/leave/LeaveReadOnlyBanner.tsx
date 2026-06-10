export function LeaveReadOnlyBanner() {
  return (
    <div className="mb-4 p-3 rounded-md bg-amber-bg border border-amber/30 text-sm text-text">
      <strong>Read-only view.</strong> You can browse leave data but cannot add holidays or apply leave.
      Sign out and sign back in if you recently received the <em>Manage leave</em> permission, or ask an admin to grant it in Settings → Users.
    </div>
  );
}
