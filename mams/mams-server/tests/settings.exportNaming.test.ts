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
  if (touchesSettings && !permissions.includes('manage.settings')) {
    return { ok: false, requiredPermission: 'manage.settings' };
  }
  if (touchesExportNaming && !permissions.includes('manage.export_naming')) {
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

  it('rejects company fields without manage.settings', () => {
    const r = canPatchSettingsFields(['manage.export_naming'], ['companyName']);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.requiredPermission).toBe('manage.settings');
  });

  it('requires both permissions when patch touches both groups', () => {
    expect(
      canPatchSettingsFields(['manage.settings', 'manage.export_naming'], [
        'companyName',
        'exportNaming',
      ]).ok
    ).toBe(true);
    const r = canPatchSettingsFields(['manage.settings'], ['companyName', 'exportNaming']);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.requiredPermission).toBe('manage.export_naming');
  });

  it('default export naming is valid', () => {
    expect(DEFAULT_EXPORT_NAMING.patterns.dailyReportCsv).toContain('{extension}');
    expect(DEFAULT_EXPORT_NAMING.patterns.dashboardAttendanceXlsx).toContain('{extension}');
  });
});
