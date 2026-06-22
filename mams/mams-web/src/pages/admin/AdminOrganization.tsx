import { OrganizationSettingsPanel } from '../Settings';

export function AdminOrganization() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Organization</h1>
        <p className="text-sm text-text-muted mt-1">
          Company profile, compliance identifiers, branding, shifts, and export naming. Changes are audit-logged.
        </p>
      </div>
      <OrganizationSettingsPanel />
    </div>
  );
}
