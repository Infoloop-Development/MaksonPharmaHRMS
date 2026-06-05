import type { ActivityListItem } from '@mams/types';

const SECTION_LABELS: Record<string, string> = {
  company: 'Company Info',
  compliance: 'Compliance Identifiers',
  shifts: 'Shifts',
  smart_anchor: 'Smart Anchor v2',
  confidentiality: 'Confidentiality Notice',
  settings: 'Settings',
};

const SETTINGS_FIELD_LABELS: Record<string, string> = {
  companyName: 'Company name',
  registeredAddress: 'Registered address',
  signatoryName: 'Signatory name',
  signatoryDesignation: 'Signatory designation',
  cin: 'CIN',
  gstin: 'GSTIN',
  pfRegistrationNumber: 'PF registration',
  esiRegistrationNumber: 'ESI registration',
  factoryLicenceNumber: 'Factory licence',
  weeklyOffDefault: 'Weekly off default',
  realShifts: 'Real shifts',
  complianceShifts: 'Compliance shifts',
  smartAnchorEnabled: 'Smart Anchor',
  confidentialityNoticeEnabled: 'Confidentiality notice',
  confidentialityNoticeText: 'Confidentiality notice text',
};

const MAX_VALUE_PREVIEW = 40;

function truncatePreview(v: unknown): string {
  const s = fmtVal(v);
  if (s.length <= MAX_VALUE_PREVIEW) return s;
  return `${s.slice(0, MAX_VALUE_PREVIEW)}…`;
}

function labelForField(key: string): string {
  return SETTINGS_FIELD_LABELS[key] ?? key;
}

function formatSettingsChanged(payload: Record<string, unknown>): string {
  const section = SECTION_LABELS[String(payload.section)] ?? 'Settings';
  const fields = (payload.changedFields as string[] | undefined) ?? [];
  const before = (payload.before as Record<string, unknown> | undefined) ?? {};
  const after = (payload.after as Record<string, unknown> | undefined) ?? {};

  if (fields.length === 0) return `Updated ${section}`;

  if (fields.length === 1) {
    const key = fields[0]!;
    const label = labelForField(key);
    return `Updated ${section}: ${label} (“${truncatePreview(before[key])}” → “${truncatePreview(after[key])}”)`;
  }

  const labels = fields.map(labelForField).join(', ');
  return `Updated ${section}: ${labels}`;
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined || v === '') return '(empty)';
  if (typeof v === 'boolean') return v ? 'on' : 'off';
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

function filterParts(payload: Record<string, unknown>, keys: string[]): string {
  return keys
    .filter((k) => payload[k] !== undefined && payload[k] !== '' && payload[k] !== 'all')
    .map((k) => `${k}: ${fmtVal(payload[k])}`)
    .join(', ');
}

export function activityPageBadge(eventType: string, payload: Record<string, unknown>): string {
  if (payload.page && typeof payload.page === 'string') {
    const p = payload.page;
    return p.charAt(0).toUpperCase() + p.slice(1);
  }
  if (eventType.startsWith('ui.employees') || eventType === 'employee_created' || eventType === 'csv_import') {
    return 'Employees';
  }
  if (eventType.startsWith('ui.attendance')) return 'Attendance';
  if (eventType.startsWith('ui.reports')) return 'Reports';
  if (eventType.startsWith('ui.devices') || eventType.startsWith('device_')) return 'Devices';
  if (eventType === 'settings_changed') return 'Settings';
  if (eventType.startsWith('user_')) return 'Settings';
  if (['login', 'logout', 'password_changed'].includes(eventType)) return 'Auth';
  return 'System';
}

export function formatActivityDescription(item: ActivityListItem): string {
  const p = item.payload ?? {};

  switch (item.eventType) {
    case 'login':
      return 'Signed in';
    case 'logout':
      return 'Signed out';
    case 'password_changed':
      return 'Changed password';
    case 'employee_created':
      return `Added employee${p.empCode ? ` (${p.empCode})` : ''}`;
    case 'csv_import':
      return `Imported CSV: ${p.successCount ?? 0} employee(s) added`;
    case 'ui.employees.search':
      return p.search ? `Searched employees for “${p.search}”` : 'Cleared employee search';
    case 'ui.attendance.filter': {
      const parts = filterParts(p, ['search', 'date', 'punchType']);
      return parts ? `Attendance filters: ${parts}` : 'Updated attendance filters';
    }
    case 'ui.reports.filter': {
      const tab = p.tab ?? 'report';
      const parts = filterParts(p, ['startDate', 'endDate', 'month', 'department', 'location']);
      return parts ? `Reports (${tab}): ${parts}` : `Changed reports tab to ${tab}`;
    }
    case 'ui.reports.print': {
      const tab = p.tab ?? 'daily';
      const parts = filterParts(p, ['startDate', 'endDate', 'department', 'location']);
      return `Printed ${tab} report${parts ? ` (${parts})` : ''}`;
    }
    case 'ui.reports.export_csv': {
      const parts = filterParts(p, ['startDate', 'endDate', 'department', 'location']);
      return `Exported daily report CSV${parts ? ` (${parts})` : ''}`;
    }
    case 'ui.devices.filter': {
      const parts = filterParts(p, ['vendor', 'department', 'location', 'network', 'connection']);
      return parts ? `Device filters: ${parts}` : 'Updated device filters';
    }
    case 'device_registered':
      return `Registered device ${p.serialNumber ?? ''} (${p.vendor ?? 'eSSL'})`.trim();
    case 'devices_synced_all':
      return `Sync all devices (${p.deviceCount ?? 0} unit(s))`;
    case 'device_synced':
      return 'Synced device';
    case 'device_updated':
      return `Updated device (${(p.changedFields as string[] | undefined)?.join(', ') ?? 'fields'})`;
    case 'settings_changed':
      return formatSettingsChanged(p);
    case 'user_created':
      return `Added user ${p.email ?? ''} (${p.role ?? ''})`.trim();
    case 'user_updated':
      return p.self ? 'Updated own profile' : `Updated user permissions/settings`;
    default:
      return item.eventType.replace(/_/g, ' ');
  }
}
