import { z } from 'zod';

export const ExportTypeKeySchema = z.enum([
  'dailyReportCsv',
  'monthlyReportCsv',
  'departmentReportCsv',
  'locationReportCsv',
  'leaveApplicationsCsv',
  'dashboardAttendanceXlsx',
  'adminOverviewAttendanceXlsx',
  'adminOverviewEmployeesXlsx',
  'adminOverviewUsersXlsx',
  'adminOverviewDevicesXlsx',
  'adminOverviewAuditXlsx',
]);
export type ExportTypeKey = z.infer<typeof ExportTypeKeySchema>;

export const ExportDateFormatSchema = z.enum(['YYYYMMDD', 'DDMMYY']);
export type ExportDateFormat = z.infer<typeof ExportDateFormatSchema>;

export const EXPORT_TYPE_LABELS: Record<ExportTypeKey, string> = {
  dailyReportCsv: 'Daily report (CSV)',
  monthlyReportCsv: 'Monthly summary (CSV)',
  departmentReportCsv: 'Department report (CSV)',
  locationReportCsv: 'Location report (CSV)',
  leaveApplicationsCsv: 'Leave applications (CSV)',
  dashboardAttendanceXlsx: 'Dashboard attendance (Excel)',
  adminOverviewAttendanceXlsx: 'Admin overview attendance (Excel)',
  adminOverviewEmployeesXlsx: 'Admin overview employees (Excel)',
  adminOverviewUsersXlsx: 'Admin overview users (Excel)',
  adminOverviewDevicesXlsx: 'Admin overview devices (Excel)',
  adminOverviewAuditXlsx: 'Admin overview audit (Excel)',
};

export const EXPORT_REPORT_TYPE_CODES: Record<ExportTypeKey, string> = {
  dailyReportCsv: 'DailyAttendance',
  monthlyReportCsv: 'MonthlySummary',
  departmentReportCsv: 'DepartmentReport',
  locationReportCsv: 'LocationReport',
  leaveApplicationsCsv: 'LeaveApplications',
  dashboardAttendanceXlsx: 'AttendanceExport',
  adminOverviewAttendanceXlsx: 'AdminOverviewAttendance',
  adminOverviewEmployeesXlsx: 'AdminOverviewEmployees',
  adminOverviewUsersXlsx: 'AdminOverviewUsers',
  adminOverviewDevicesXlsx: 'AdminOverviewDevices',
  adminOverviewAuditXlsx: 'AdminOverviewAudit',
};

export const EXPORT_FILE_EXTENSIONS: Record<ExportTypeKey, string> = {
  dailyReportCsv: 'csv',
  monthlyReportCsv: 'csv',
  departmentReportCsv: 'csv',
  locationReportCsv: 'csv',
  leaveApplicationsCsv: 'csv',
  dashboardAttendanceXlsx: 'xlsx',
  adminOverviewAttendanceXlsx: 'xlsx',
  adminOverviewEmployeesXlsx: 'xlsx',
  adminOverviewUsersXlsx: 'xlsx',
  adminOverviewDevicesXlsx: 'xlsx',
  adminOverviewAuditXlsx: 'xlsx',
};

export const EXPORT_NAMING_TOKENS = [
  'company',
  'reportType',
  'department',
  'location',
  'startDate',
  'endDate',
  'asOfDate',
  'generatedAt',
  'extension',
] as const;

export type ExportNamingToken = (typeof EXPORT_NAMING_TOKENS)[number];

const patternSchema = z
  .string()
  .min(1)
  .max(200)
  .refine((p) => !/[\\/]/.test(p) && !p.includes('..'), 'Pattern must not contain path separators')
  .refine((p) => p.endsWith('.{extension}'), 'Pattern must end with .{extension}')
  .refine((p) => {
    const tokens = p.match(/\{[a-zA-Z]+\}/g) ?? [];
    return tokens.every((t) => {
      const key = t.slice(1, -1);
      return (EXPORT_NAMING_TOKENS as readonly string[]).includes(key);
    });
  }, 'Pattern contains invalid tokens');

export const ExportNamingSettingsSchema = z.object({
  companyCode: z.string().max(20).optional().default(''),
  dateFormat: ExportDateFormatSchema.default('YYYYMMDD'),
  includeGeneratedTimestamp: z.boolean().default(false),
  patterns: z.object({
    dailyReportCsv: patternSchema,
    monthlyReportCsv: patternSchema,
    departmentReportCsv: patternSchema,
    locationReportCsv: patternSchema,
    leaveApplicationsCsv: patternSchema,
    dashboardAttendanceXlsx: patternSchema,
    adminOverviewAttendanceXlsx: patternSchema,
    adminOverviewEmployeesXlsx: patternSchema,
    adminOverviewUsersXlsx: patternSchema,
    adminOverviewDevicesXlsx: patternSchema,
    adminOverviewAuditXlsx: patternSchema,
  }),
});

export type ExportNamingSettings = z.infer<typeof ExportNamingSettingsSchema>;

export const DEFAULT_EXPORT_NAMING: ExportNamingSettings = {
  companyCode: '',
  dateFormat: 'YYYYMMDD',
  includeGeneratedTimestamp: false,
  patterns: {
    dailyReportCsv:
      '{company}_{reportType}_{department}_{location}_{startDate}-{endDate}.{extension}',
    monthlyReportCsv: '{company}_{reportType}_{department}_{location}_{asOfDate}.{extension}',
    departmentReportCsv: '{company}_{reportType}_{asOfDate}.{extension}',
    locationReportCsv: '{company}_{reportType}_{asOfDate}.{extension}',
    leaveApplicationsCsv: '{company}_{reportType}.{extension}',
    dashboardAttendanceXlsx: '{company}_{reportType}_{department}_{asOfDate}.{extension}',
    adminOverviewAttendanceXlsx: '{company}_{reportType}_{department}_{asOfDate}.{extension}',
    adminOverviewEmployeesXlsx: '{company}_{reportType}_{department}_{asOfDate}.{extension}',
    adminOverviewUsersXlsx: '{company}_{reportType}_{asOfDate}.{extension}',
    adminOverviewDevicesXlsx: '{company}_{reportType}_{location}_{asOfDate}.{extension}',
    adminOverviewAuditXlsx: '{company}_{reportType}_{asOfDate}.{extension}',
  },
};

export function normalizeExportNaming(input: unknown): ExportNamingSettings {
  const parsed = ExportNamingSettingsSchema.safeParse(input);
  if (parsed.success) return parsed.data;

  const merged: ExportNamingSettings = {
    ...DEFAULT_EXPORT_NAMING,
    patterns: { ...DEFAULT_EXPORT_NAMING.patterns },
  };
  if (!input || typeof input !== 'object') return merged;

  const obj = input as Record<string, unknown>;
  if (typeof obj.companyCode === 'string') merged.companyCode = obj.companyCode.slice(0, 20);
  if (obj.dateFormat === 'YYYYMMDD' || obj.dateFormat === 'DDMMYY') merged.dateFormat = obj.dateFormat;
  if (typeof obj.includeGeneratedTimestamp === 'boolean') {
    merged.includeGeneratedTimestamp = obj.includeGeneratedTimestamp;
  }

  if (obj.patterns && typeof obj.patterns === 'object') {
    const patterns = obj.patterns as Record<string, unknown>;
    for (const key of ExportTypeKeySchema.options) {
      const validated = ExportNamingSettingsSchema.shape.patterns.shape[key].safeParse(patterns[key]);
      if (validated.success) merged.patterns[key] = validated.data;
    }
  }

  return merged;
}

export type ExportFileNameContext = {
  department?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  asOfDate?: string;
  generatedAt?: Date;
  companyName?: string;
};

function sanitizeScope(value: string | undefined, allLabel: string): string {
  const raw = (value ?? '').trim();
  if (!raw || raw.toLowerCase() === 'all') return allLabel;
  const cleaned = raw.replace(/[^a-zA-Z0-9]/g, '');
  return cleaned || allLabel;
}

function deriveCompanyCode(companyName: string | undefined, override: string): string {
  const trimmed = override.trim();
  if (trimmed) {
    return trimmed.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 20) || 'COMPANY';
  }
  const fromName = (companyName ?? '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 20);
  return fromName || 'COMPANY';
}

function formatExportDate(isoDate: string | undefined, format: ExportDateFormat): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';
  const parts = isoDate.split('-');
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return '';
  if (format === 'DDMMYY') return `${d}${m}${y.slice(2)}`;
  return `${y}${m}${d}`;
}

function formatGeneratedAt(date: Date, format: ExportDateFormat): string {
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  if (format === 'DDMMYY') return `${d}${m}${y.slice(2)}_${hh}${mm}`;
  return `${y}${m}${d}_${hh}${mm}`;
}

function resolvePattern(type: ExportTypeKey, settings: ExportNamingSettings): string {
  const pattern = settings.patterns[type];
  const validated = ExportNamingSettingsSchema.shape.patterns.shape[type].safeParse(pattern);
  if (validated.success) return validated.data;
  return DEFAULT_EXPORT_NAMING.patterns[type];
}

export function buildExportFileName(
  type: ExportTypeKey,
  context: ExportFileNameContext,
  exportNamingInput: unknown,
  companyName?: string
): string {
  const settings = normalizeExportNaming(exportNamingInput);
  const pattern = resolvePattern(type, settings);
  const now = context.generatedAt ?? new Date();
  const extension = EXPORT_FILE_EXTENSIONS[type];
  const dateFormat = settings.dateFormat;

  const tokens: Record<string, string> = {
    company: deriveCompanyCode(context.companyName ?? companyName, settings.companyCode),
    reportType: EXPORT_REPORT_TYPE_CODES[type],
    department: sanitizeScope(context.department, 'AllDepts'),
    location: sanitizeScope(context.location, 'AllLocations'),
    startDate: formatExportDate(context.startDate, dateFormat),
    endDate: formatExportDate(context.endDate, dateFormat),
    asOfDate: formatExportDate(context.asOfDate, dateFormat) || context.asOfDate || '',
    generatedAt: settings.includeGeneratedTimestamp ? formatGeneratedAt(now, dateFormat) : '',
    extension,
  };

  let filename = pattern.replace(/\{([a-zA-Z]+)\}/g, (_match, key: string) => tokens[key] ?? '');

  if (settings.includeGeneratedTimestamp && !pattern.includes('{generatedAt}')) {
    const stamp = tokens.generatedAt;
    if (stamp) {
      const dot = filename.lastIndexOf('.');
      filename =
        dot > 0 ? `${filename.slice(0, dot)}_${stamp}${filename.slice(dot)}` : `${filename}_${stamp}`;
    }
  }

  filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
  return filename.slice(0, 200) || `export.${extension}`;
}

export function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].trim());
    } catch {
      return utf8[1].trim();
    }
  }
  const plain = /filename="([^"]+)"/i.exec(header) ?? /filename=([^;]+)/i.exec(header);
  return plain?.[1]?.trim() ?? null;
}
