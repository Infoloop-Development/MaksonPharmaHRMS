import type { VisitorField } from '@mams/types';
import type { VisitorFormItem, VisitorRequestListItem } from '../api/visitors';
import { visitorsApi } from '../api/visitors';
import type { CompanyBranding } from './companyBranding';
import { fmtIstDate, fmtIstTime } from './format';
import { openReportPrintWindow, type ReportPrintColumn } from './reportPrintDocument';
import { formatVisitorResponse } from '../components/visitors/visitorsUtils';

export type VisitorResponsesFilters = {
  status?: 'Pending' | 'Approved' | 'Rejected';
  startDate?: string;
  endDate?: string;
  search?: string;
};

const PAGE_SIZE = 100;
const MAX_ROWS = 500;

export function buildVisitorResponseFieldColumns(fields: VisitorField[]): ReportPrintColumn[] {
  return [...fields]
    .sort((a, b) => a.order - b.order)
    .map((f) => ({ key: f.id, label: f.label }));
}

export function buildVisitorResponsePrintRows(
  items: VisitorRequestListItem[],
  fields: VisitorField[]
): Record<string, string | number>[] {
  const sortedFields = [...fields].sort((a, b) => a.order - b.order);
  return items.map((item) => {
    const row: Record<string, string | number> = {
      submitted: `${fmtIstDate(item.submittedAt)} ${fmtIstTime(item.submittedAt)}`,
      status: item.status,
    };
    for (const field of sortedFields) {
      if (field.type === 'file') {
        const att = item.fileAttachments?.find((a) => a.fieldId === field.id);
        row[field.id] = att?.filename ?? '—';
      } else {
        row[field.id] = formatVisitorResponse(item.responses[field.id]);
      }
    }
    return row;
  });
}

export function buildVisitorResponsesFilterSubtitle(filters: VisitorResponsesFilters): string | undefined {
  const parts: string[] = [];
  if (filters.startDate) parts.push(`From ${filters.startDate}`);
  if (filters.endDate) parts.push(`To ${filters.endDate}`);
  if (filters.status) parts.push(`Status: ${filters.status}`);
  if (filters.search?.trim()) parts.push(`Search: ${filters.search.trim()}`);
  return parts.length ? parts.join(' · ') : undefined;
}

export async function fetchAllFilteredVisitorResponses(
  formId: string,
  filters: VisitorResponsesFilters
): Promise<{ items: VisitorRequestListItem[]; truncated: boolean }> {
  const items: VisitorRequestListItem[] = [];
  let page = 1;
  let truncated = false;

  while (items.length < MAX_ROWS) {
    const res = await visitorsApi.listRequests({
      formId,
      status: filters.status,
      startDate: filters.startDate,
      endDate: filters.endDate,
      search: filters.search,
      page,
      pageSize: PAGE_SIZE,
    });
    items.push(...res.items);
    if (items.length >= res.total || res.items.length < PAGE_SIZE) break;
    if (items.length >= MAX_ROWS) {
      truncated = true;
      break;
    }
    page += 1;
  }

  return { items: items.slice(0, MAX_ROWS), truncated };
}

export function openVisitorResponsesPrintWindow(options: {
  branding: CompanyBranding;
  form: VisitorFormItem;
  items: VisitorRequestListItem[];
  filters: VisitorResponsesFilters;
}): boolean {
  const fieldColumns = buildVisitorResponseFieldColumns(options.form.fields);
  const columns: ReportPrintColumn[] = [
    { key: 'submitted', label: 'Submitted', mono: true },
    { key: 'status', label: 'Status' },
    ...fieldColumns,
  ];
  const rows = buildVisitorResponsePrintRows(options.items, options.form.fields);
  const subtitle = buildVisitorResponsesFilterSubtitle(options.filters);

  return openReportPrintWindow({
    branding: options.branding,
    title: `${options.form.title} — Responses`,
    subtitle,
    summaryLine: `${options.items.length} response(s)`,
    columns,
    rows,
    signatoryOnLastPage: false,
  });
}
