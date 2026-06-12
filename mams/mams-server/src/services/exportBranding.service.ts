import { SettingsModel } from '../models/Settings.js';

export type CompanyBranding = {
  companyName: string;
  registeredAddress: string;
  signatoryName: string;
  signatoryDesignation: string;
  confidentialityNoticeEnabled: boolean;
  confidentialityNoticeText: string;
};

export type ExportBrandingMeta = {
  reportType: string;
  period?: string;
  dateRange?: string;
  generatedAt?: Date;
};

const DEFAULT_COMPANY_NAME = 'Makson Pharmaceuticals (India) Pvt. Ltd.';
const DEFAULT_ADDRESS =
  '195, Rajkot Highway, Surendranagar, Wadhwancity, Gujarat 363020';
const DEFAULT_CONFIDENTIALITY =
  'This system contains confidential employee data. Unauthorised access is prohibited.';

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function formatExportGeneratedDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function buildAuthorizedByLine(branding: CompanyBranding): string | null {
  const name = branding.signatoryName.trim();
  if (!name) return null;
  const designation = branding.signatoryDesignation.trim();
  return designation ? `${name} (${designation})` : name;
}

function brandingMetaRows(
  branding: CompanyBranding,
  meta: ExportBrandingMeta
): Array<[string, string]> {
  const rows: Array<[string, string]> = [['Company', branding.companyName]];
  if (branding.registeredAddress.trim()) {
    rows.push(['Address', branding.registeredAddress]);
  }
  rows.push(['Report Type', meta.reportType]);
  if (meta.period) rows.push(['Period', meta.period]);
  if (meta.dateRange) rows.push(['Date Range', meta.dateRange]);
  rows.push(['Generated', formatExportGeneratedDate(meta.generatedAt ?? new Date())]);
  const authorized = buildAuthorizedByLine(branding);
  if (authorized) rows.push(['Authorized By', authorized]);
  return rows;
}

export function buildCsvPreamble(branding: CompanyBranding, meta: ExportBrandingMeta): string[] {
  return brandingMetaRows(branding, meta).map(([key, value]) => `${key},${csvEscape(value)}`);
}

export function buildCsvFooter(branding: CompanyBranding): string[] {
  if (!branding.confidentialityNoticeEnabled) return [];
  const text =
    branding.confidentialityNoticeText.trim() ||
    'Confidential - Contains employee PII protected under IT Act 2000. Unauthorized distribution prohibited.';
  return [`"${text.replace(/"/g, '""')}"`];
}

export function buildXlsxHeaderRows(
  branding: CompanyBranding,
  meta: ExportBrandingMeta
): string[][] {
  return brandingMetaRows(branding, meta).map(([key, value]) => [key, value]);
}

export function brandingFromSettingsDoc(
  doc: {
    companyName?: string;
    registeredAddress?: string;
    signatoryName?: string;
    signatoryDesignation?: string;
    confidentialityNoticeEnabled?: boolean;
    confidentialityNoticeText?: string;
  } | null
): CompanyBranding {
  return {
    companyName: doc?.companyName?.trim() || DEFAULT_COMPANY_NAME,
    registeredAddress: doc?.registeredAddress?.trim() || DEFAULT_ADDRESS,
    signatoryName: doc?.signatoryName?.trim() || '',
    signatoryDesignation: doc?.signatoryDesignation?.trim() || '',
    confidentialityNoticeEnabled: doc?.confidentialityNoticeEnabled ?? true,
    confidentialityNoticeText: doc?.confidentialityNoticeText?.trim() || DEFAULT_CONFIDENTIALITY,
  };
}

export async function loadCompanyBranding(): Promise<CompanyBranding> {
  const doc = await SettingsModel.findOne().lean();
  return brandingFromSettingsDoc(doc);
}

export function joinCsvDocument(lines: string[]): string {
  return `\uFEFF${lines.join('\n')}`;
}
