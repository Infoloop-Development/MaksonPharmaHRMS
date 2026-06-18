import { describe, it, expect } from 'vitest';
import { DEFAULT_EXPORT_NAMING } from '@mams/types';

const MANAGE_SETTINGS_FIELDS = new Set([
  'companyName',
  'cin',
  'gstin',
  'pfRegistrationNumber',
  'esiRegistrationNumber',
  'factoryLicenceNumber',
  'registeredAddress',
  'signatoryName',
  'signatoryDesignation',
  'weeklyOffDefault',
  'realShifts',
  'complianceShifts',
  'smartAnchorEnabled',
  'confidentialityNoticeEnabled',
  'confidentialityNoticeText',
]);

function canPatchSettingsFields(
  permissions: string[],
  changedKeys: string[]
): { ok: true } | { ok: false; requiredPermission: string } {
  const touchesSettings = changedKeys.some((k) => MANAGE_SETTINGS_FIELDS.has(k));
  const touchesExportNaming = changedKeys.includes('exportNaming');
  const canOrgSettings = permissions.includes('manage.org_settings') || permissions.includes('manage.settings');
  const canExportNaming =
    permissions.includes('manage.org_settings') ||
    permissions.includes('manage.export_naming') ||
    permissions.includes('manage.settings');
  if (touchesSettings && !canOrgSettings) {
    return { ok: false, requiredPermission: 'manage.org_settings' };
  }
  if (touchesExportNaming && !canExportNaming) {
    return { ok: false, requiredPermission: 'manage.export_naming' };
  }
  return { ok: true };
}

describe('settings exportNaming PATCH auth rules', () => {
  it('allows exportNaming patch with manage.export_naming', () => {
    expect(canPatchSettingsFields(['manage.export_naming'], ['exportNaming']).ok).toBe(true);
  });

  it('rejects exportNaming patch without manage.export_naming', () => {
    const r = canPatchSettingsFields(['read.real'], ['exportNaming']);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.requiredPermission).toBe('manage.export_naming');
  });

  it('rejects company fields without manage.org_settings', () => {
    const r = canPatchSettingsFields(['manage.export_naming'], ['companyName']);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.requiredPermission).toBe('manage.org_settings');
  });

  it('manage.org_settings alone can patch export naming and company fields', () => {
    expect(
      canPatchSettingsFields(['manage.org_settings'], ['companyName', 'exportNaming']).ok
    ).toBe(true);
  });

  it('requires export permission when only manage.export_naming is held', () => {
    const r = canPatchSettingsFields(['manage.export_naming'], ['companyName']);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.requiredPermission).toBe('manage.org_settings');
  });

  it('default export naming is valid', () => {
    expect(DEFAULT_EXPORT_NAMING.patterns.dailyReportCsv).toContain('{extension}');
    expect(DEFAULT_EXPORT_NAMING.patterns.monthlyReportCsv).toContain('{extension}');
    expect(DEFAULT_EXPORT_NAMING.patterns.departmentReportCsv).toContain('{extension}');
    expect(DEFAULT_EXPORT_NAMING.patterns.locationReportCsv).toContain('{extension}');
    expect(DEFAULT_EXPORT_NAMING.patterns.leaveApplicationsCsv).toContain('{extension}');
    expect(DEFAULT_EXPORT_NAMING.patterns.dashboardAttendanceXlsx).toContain('{extension}');
  });
});
