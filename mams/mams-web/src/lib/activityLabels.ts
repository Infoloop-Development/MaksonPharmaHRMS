import type { ActivityListItem } from '@mams/types';
import { TIME_FORMAT_LABELS, formatIstInstant, type TimeFormat } from './timeFormat';

const SECTION_LABELS: Record<string, string> = {
  company: 'Company Info',
  compliance: 'Compliance Identifiers',
  shifts: 'Shifts',
  smart_anchor: 'Smart Anchor v2',
  confidentiality: 'Confidentiality Notice',
  export_naming: 'Export filename formats',
  brand_assets: 'Brand Assets',
  time_display: 'Time display',
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
  exportNaming: 'Export filename formats',
  companyLogo: 'Company logo',
  favicon: 'Favicon',
  timeFormat: 'Time format',
};

const MOBILE_CHART_LABELS: Record<string, string> = {
  both: 'Both charts',
  bar: 'Bar only',
  donut: 'Donut only',
};

const PERMISSION_LABELS: Record<string, string> = {
  'manage.export_naming': 'export filename formats',
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

function formatExportNamingDiff(before: unknown, after: unknown): string {
  const b = (before && typeof before === 'object' ? before : {}) as Record<string, unknown>;
  const a = (after && typeof after === 'object' ? after : {}) as Record<string, unknown>;
  const parts: string[] = [];
  if (b.companyCode !== a.companyCode) {
    parts.push(`company code “${truncatePreview(a.companyCode)}”`);
  }
  if (b.dateFormat !== a.dateFormat) {
    parts.push(`date format ${String(a.dateFormat ?? '')}`);
  }
  if (b.includeGeneratedTimestamp !== a.includeGeneratedTimestamp) {
    parts.push(a.includeGeneratedTimestamp ? 'timestamp on' : 'timestamp off');
  }
  const bPatterns = (b.patterns ?? {}) as Record<string, string>;
  const aPatterns = (a.patterns ?? {}) as Record<string, string>;
  for (const key of ['dailyReportCsv', 'dashboardAttendanceXlsx']) {
    if (bPatterns[key] !== aPatterns[key]) {
      parts.push(`${key} pattern updated`);
    }
  }
  return parts.length > 0 ? parts.join(', ') : 'export filename settings';
}

function permissionDiffNote(added?: string[], removed?: string[]): string {
  const bits: string[] = [];
  for (const p of added ?? []) {
    if (PERMISSION_LABELS[p]) bits.push(`granted ${PERMISSION_LABELS[p]}`);
  }
  for (const p of removed ?? []) {
    if (PERMISSION_LABELS[p]) bits.push(`revoked ${PERMISSION_LABELS[p]}`);
  }
  return bits.length > 0 ? ` (${bits.join('; ')})` : '';
}

function formatSettingsChanged(payload: Record<string, unknown>): string {
  const section = SECTION_LABELS[String(payload.section)] ?? 'Settings';
  const fields = (payload.changedFields as string[] | undefined) ?? [];
  const before = (payload.before as Record<string, unknown> | undefined) ?? {};
  const after = (payload.after as Record<string, unknown> | undefined) ?? {};

  if (fields.length === 0) return `Updated ${section}`;

  const brandFields = fields.filter((f) => f === 'companyLogo' || f === 'favicon');
  if (brandFields.length > 0) {
    const parts = brandFields.map((f) => {
      const label = f === 'companyLogo' ? 'company logo' : 'favicon';
      return after[f] == null || after[f] === '' ? `removed ${label}` : `updated ${label}`;
    });
    return `Updated Brand Assets: ${parts.join(', ')}`;
  }

  if (fields.length === 1 && fields[0] === 'exportNaming') {
    return `Updated ${section}: ${formatExportNamingDiff(before.exportNaming, after.exportNaming)}`;
  }

  if (fields.length === 1) {
    const key = fields[0]!;
    const label = labelForField(key);
    if (key === 'timeFormat') {
      const from = TIME_FORMAT_LABELS[String(before.timeFormat) as TimeFormat] ?? String(before.timeFormat);
      const to = TIME_FORMAT_LABELS[String(after.timeFormat) as TimeFormat] ?? String(after.timeFormat);
      return `Updated ${section}: ${label} (“${from}” → “${to}”)`;
    }
    return `Updated ${section}: ${label} (“${truncatePreview(before[key])}” → “${truncatePreview(after[key])}”)`;
  }

  const labels = fields.map(labelForField).join(', ');
  return `Updated ${section}: ${labels}`;
}

function unmaskEmployeeRef(p: Record<string, unknown>): string {
  const name = typeof p.empName === 'string' && p.empName ? p.empName : null;
  const code = typeof p.empCode === 'string' && p.empCode ? p.empCode : null;
  if (name && code) return `${name} (${code})`;
  if (name) return name;
  if (code) return code;
  return 'employee';
}

function unmaskReasonSuffix(p: Record<string, unknown>): string {
  const reason = typeof p.reason === 'string' && p.reason.trim() ? p.reason.trim() : '';
  return reason ? ` — reason: “${reason}”` : '';
}

/** Green dot = succeeded, red dot = failed; null = not an unmask event. */
export function unmaskActivityOutcome(eventType: string): boolean | null {
  if (eventType === 'unmask_succeeded') return true;
  if (eventType === 'unmask_failed') return false;
  return null;
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
  if (
    eventType.startsWith('ui.employees') ||
    eventType === 'employee_created' ||
    eventType === 'csv_import' ||
    eventType === 'unmask_succeeded' ||
    eventType === 'unmask_failed'
  ) {
    return 'Employees';
  }
  if (eventType.startsWith('ui.attendance')) return 'Attendance';
  if (eventType.startsWith('ui.reports')) return 'Reports';
  if (eventType.startsWith('ui.devices') || eventType.startsWith('device_')) return 'Devices';
  if (eventType === 'settings_changed') return 'Settings';
  if (eventType.startsWith('user_')) return 'Settings';
  if (
    eventType.startsWith('ui.dashboard') ||
    eventType === 'dashboard_layout_saved' ||
    eventType === 'dashboard_kpi_saved'
  ) {
    return 'Dashboard';
  }
  if (
    eventType.startsWith('ui.admin') ||
    eventType === 'admin_overview_layout_saved' ||
    eventType === 'admin_overview_kpi_saved' ||
    eventType === 'admin_overview_table_saved' ||
    eventType === 'admin_overview_widgets_saved'
  ) {
    return 'Admin';
  }
  if (eventType.startsWith('leave_') || eventType === 'holiday_created') return 'Leave';
  if (eventType.startsWith('regularization_')) return 'Regularization';
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
    case 'ui.dashboard.filter': {
      const parts = filterParts(p, ['date', 'statusFilter', 'shiftFilter', 'department', 'search']);
      return parts ? `Dashboard filters: ${parts}` : 'Updated dashboard filters';
    }
    case 'ui.dashboard.export_xlsx': {
      const parts = filterParts(p, ['date', 'department', 'status', 'timeShift', 'search']);
      return `Exported dashboard attendance Excel${parts ? ` (${parts})` : ''}`;
    }
    case 'ui.dashboard.export_pdf': {
      const parts = filterParts(p, ['date', 'department', 'status', 'timeShift', 'search']);
      return `Exported dashboard attendance PDF${parts ? ` (${parts})` : ''}`;
    }
    case 'dashboard_layout_saved': {
      const mobile = MOBILE_CHART_LABELS[String(p.mobileChart)] ?? String(p.mobileChart ?? 'both');
      const tablePos = p.tablePosition === 'top' ? 'table on top' : 'charts on top';
      const fields = (p.changedFields as string[] | undefined) ?? [];
      const detail = fields.includes('mobileChart') && fields.includes('rows')
        ? `${tablePos}; mobile: ${mobile}`
        : fields.includes('mobileChart')
          ? `mobile chart: ${mobile}`
          : tablePos;
      return `Saved dashboard layout (${detail})`;
    }
    case 'dashboard_kpi_saved': {
      const slots = (p.slotsAfter as string[] | undefined) ?? (p.slots as string[] | undefined) ?? [];
      const labels = slots.slice(0, 4).join(', ');
      return labels ? `Customized KPI cards (${labels})` : 'Customized KPI cards';
    }
    case 'admin_overview_layout_saved': {
      const mobile = MOBILE_CHART_LABELS[String(p.mobileChart)] ?? String(p.mobileChart ?? 'both');
      const tablePos = p.tablePosition === 'top' ? 'table on top' : 'charts on top';
      return `Saved admin overview layout (${tablePos}; mobile: ${mobile})`;
    }
    case 'admin_overview_kpi_saved': {
      const slots = (p.slotsAfter as string[] | undefined) ?? (p.slots as string[] | undefined) ?? [];
      const labels = slots.slice(0, 4).join(', ');
      return labels ? `Customized admin overview KPIs (${labels})` : 'Customized admin overview KPIs';
    }
    case 'admin_overview_table_saved': {
      const kind = String(p.kindAfter ?? p.kind ?? 'table');
      return `Saved admin overview table (${kind})`;
    }
    case 'admin_overview_widgets_saved': {
      const count = (p.count as number | undefined) ?? 0;
      const metrics = (p.metrics as string[] | undefined) ?? [];
      return metrics.length
        ? `Saved admin overview charts (${count} widgets: ${metrics.slice(0, 3).join(', ')}${metrics.length > 3 ? '…' : ''})`
        : `Saved admin overview charts (${count} widgets)`;
    }
    case 'device_registered':
      return `Registered device ${p.serialNumber ?? ''} (${p.vendor ?? 'eSSL'})`.trim();
    case 'device_deleted':
      return `Deleted device ${p.serialNumber ?? ''} (${p.vendor ?? 'eSSL'})`.trim();
    case 'devices_synced_all':
      return `Sync all devices (${p.deviceCount ?? 0} unit(s))`;
    case 'device_synced':
      return 'Synced device';
    case 'device_updated':
      return `Updated device (${(p.changedFields as string[] | undefined)?.join(', ') ?? 'fields'})`;
    case 'leave_applied':
      return `Applied leave (${p.status ?? 'submitted'}, ${p.totalDays ?? '?'} day(s))`;
    case 'leave_approved':
      return 'Approved leave request';
    case 'leave_rejected':
      return `Rejected leave request${p.note ? `: “${truncatePreview(p.note)}”` : ''}`;
    case 'leave_cancelled':
      return 'Cancelled leave request';
    case 'leave_quota_adjusted':
      return `Adjusted leave quota (${p.delta ?? '?'} day(s))`;
    case 'holiday_created':
      return `Added holiday “${p.name ?? ''}” (${p.date ?? ''})`;
    case 'regularization_created':
      return `Created regularization request (${p.type ?? 'unknown'}, ${p.date ?? ''})`;
    case 'regularization_approved':
      return 'Approved regularization request — raw punches inserted';
    case 'regularization_rejected':
      return `Rejected regularization request${p.note ? `: “${truncatePreview(p.note)}”` : ''}`;
    case 'visitor_request_submitted':
      return 'Visitor request submitted (public form)';
    case 'visitor_request_approved': {
      const until = typeof p.visitValidUntil === 'string' ? p.visitValidUntil : undefined;
      if (until) {
        return `Approved visitor request (valid until ${formatIstInstant(until, '12h')})`;
      }
      return 'Approved visitor request';
    }
    case 'visitor_request_rejected':
      return `Rejected visitor request${p.note ? `: “${truncatePreview(p.note)}”` : ''}`;
    case 'visitor_form_created':
      return `Created visitor form “${p.title ?? ''}”`;
    case 'visitor_form_updated':
      return 'Updated visitor form';
    case 'visitor_form_slug_regenerated':
      return 'Regenerated visitor form public link & QR code';
    case 'settings_changed':
      return formatSettingsChanged(p);
    case 'user_created': {
      const base = `Added user ${p.email ?? ''} (${p.role ?? ''})`.trim();
      const perms = p.permissions as string[] | undefined;
      const exportNaming = perms?.includes('manage.export_naming')
        ? '; can configure export filenames'
        : '';
      return `${base}${exportNaming}`;
    }
    case 'user_updated': {
      if (p.self) return 'Updated own profile';
      const added = p.permissionsAdded as string[] | undefined;
      const removed = p.permissionsRemoved as string[] | undefined;
      const note = permissionDiffNote(added, removed);
      if (note) return `Updated user permissions${note}`;
      return 'Updated user permissions/settings';
    }
    case 'unmask_succeeded': {
      const label = String(p.fieldLabel ?? p.field ?? 'field');
      return `Unmasked ${label} for ${unmaskEmployeeRef(p)}${unmaskReasonSuffix(p)}`;
    }
    case 'unmask_failed': {
      const label = String(p.fieldLabel ?? p.field ?? 'field');
      const who = unmaskEmployeeRef(p);
      const suffix = unmaskReasonSuffix(p);
      if (p.failureReason === 'password_failed') {
        return `Unmask failed — password failed: ${label} for ${who}${suffix}`;
      }
      if (p.failureReason === 'forbidden') {
        return `Unmask failed — not permitted: ${label} for ${who}${suffix}`;
      }
      return `Unmask failed: ${label} for ${who}${suffix}`;
    }
    default:
      return item.eventType.replace(/_/g, ' ');
  }
}
