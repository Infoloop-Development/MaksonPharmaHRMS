import { UsersManagementPanel } from '../Settings';

export function AdminUsers() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Users & roles</h1>
        <p className="text-sm text-text-muted mt-1">
          Create and manage every account role. Only Organization Admins can assign the HR Admin role.
        </p>
      </div>
      <UsersManagementPanel />
    </div>
  );
}
