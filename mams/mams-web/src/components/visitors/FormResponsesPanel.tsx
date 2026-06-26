import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { VisitorField, VisitorRequestStatus } from '@mams/types';
import { visitorsApi, type VisitorFormItem, type VisitorRequestListItem } from '../../api/visitors';
import { settingsApi } from '../../api/settings';
import { brandingFromSettings } from '../../lib/companyBranding';
import { fmtIstDate, fmtIstTime } from '../../lib/format';
import { useTimeDisplay } from '../../store/timeFormat';
import {
  fetchAllFilteredVisitorResponses,
  openVisitorResponsesPrintWindow,
  type VisitorResponsesFilters,
} from '../../lib/visitorResponsesPrintDocument';
import { useToast } from '../ui/Toast';
import { Badge } from '../ui/Badge';
import { Input, Select } from '../ui/Field';
import { formatVisitorResponse, visitorStatusTone } from './visitorsUtils';
import { SortableTh } from '../ui/SortableTh';
import { useTableSort } from '../../lib/tableSort';

const PAGE_SIZE = 10;

function cellValue(item: VisitorRequestListItem, field: VisitorField): string {
  if (field.type === 'file') {
    const att = item.fileAttachments?.find((a) => a.fieldId === field.id);
    return att?.filename ?? '—';
  }
  return formatVisitorResponse(item.responses[field.id]);
}

export function FormResponsesPanel({
  form,
  onViewRequest,
}: {
  form: VisitorFormItem;
  onViewRequest: (id: string) => void;
}) {
  const toast = useToast((s) => s.push);
  const { fmtDateTimeMs } = useTimeDisplay();
  const [statusFilter, setStatusFilter] = useState<VisitorRequestStatus | 'All'>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const filters: VisitorResponsesFilters = {
    status: statusFilter === 'All' ? undefined : statusFilter,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    search: search || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['visitors', 'form-responses', form._id, { ...filters, page }],
    queryFn: () =>
      visitorsApi.listRequests({
        formId: form._id,
        ...filters,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  const items = data?.items ?? [];
  const getSortValue = useCallback((row: VisitorRequestListItem, col: string) => {
    if (col === 'submitted') return row.submittedAt;
    if (col === 'status') return row.status;
    if (col === 'validUntil') return row.visitValidUntil ?? '';
    return '';
  }, []);
  const { sortCol, toggleSort, sortArrow, sortedRows } = useTableSort(items, getSortValue, {
    submitted: 'date',
    validUntil: 'date',
  });
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const fieldColumns = [...form.fields].sort((a, b) => a.order - b.order);

  const resetPage = () => setPage(1);

  const handleDownloadPdf = async () => {
    setExporting(true);
    try {
      const settings = await settingsApi.get();
      const branding = brandingFromSettings(settings);
      const { items: allItems, truncated } = await fetchAllFilteredVisitorResponses(form._id, filters);
      if (allItems.length === 0) {
        toast('No responses match the current filters', 'error');
        return;
      }
      const opened = openVisitorResponsesPrintWindow({ branding, form, items: allItems, filters });
      if (!opened) {
        toast('Could not open print window. Allow pop-ups and try again.', 'error');
        return;
      }
      if (truncated) {
        toast(`PDF includes first ${allItems.length} responses (limit reached)`, 'success');
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to prepare PDF', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold">Responses</p>
          <p className="text-xs text-text-muted">{total} submission(s)</p>
        </div>
        <button
          type="button"
          className="btn-outline text-sm"
          disabled={exporting || total === 0}
          onClick={handleDownloadPdf}
        >
          {exporting ? 'Preparing…' : 'Download PDF'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <Select
          className="md:max-w-[160px]"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as VisitorRequestStatus | 'All');
            resetPage();
          }}
        >
          <option value="All">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </Select>
        <Input
          type="date"
          className="md:max-w-[150px]"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            resetPage();
          }}
          title="From date"
        />
        <Input
          type="date"
          className="md:max-w-[150px]"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            resetPage();
          }}
          title="To date"
        />
        <Input
          className="md:max-w-[200px]"
          placeholder="Search responses…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            resetPage();
          }}
        />
      </div>

      <div className="card tbl-scroll overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-xs text-text-subtle border-b border-border bg-surface2/50">
              <SortableTh label="Submitted" sortKey="submitted" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} className="px-3 py-2 whitespace-nowrap" />
              <SortableTh label="Status" sortKey="status" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} className="px-3 py-2" />
              <SortableTh label="Valid until" sortKey="validUntil" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} className="px-3 py-2 whitespace-nowrap" />
              {fieldColumns.map((f) => (
                <th key={f.id} className="px-3 py-2 whitespace-nowrap">
                  {f.label}
                </th>
              ))}
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={fieldColumns.length + 4} className="px-3 py-8 text-center text-text-muted">
                  Loading responses…
                </td>
              </tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={fieldColumns.length + 4} className="px-3 py-8 text-center text-text-muted">
                  No responses yet.
                </td>
              </tr>
            )}
            {!isLoading &&
              sortedRows.map((item) => (
                <tr key={item._id} className="border-b border-border/60 hover:bg-surface2/50">
                  <td className="px-3 py-2 whitespace-nowrap text-xs">
                    <div>{fmtIstDate(item.submittedAt)}</div>
                    <div className="text-text-muted">{fmtIstTime(item.submittedAt)}</div>
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={visitorStatusTone(item.status)}>{item.status}</Badge>
                  </td>
                  <td className="px-3 py-2 text-xs text-text-muted whitespace-nowrap">
                    {item.status === 'Approved' && item.visitValidUntil
                      ? fmtDateTimeMs(item.visitValidUntil)
                      : '—'}
                  </td>
                  {fieldColumns.map((f) => (
                    <td key={f.id} className="px-3 py-2 max-w-[200px] truncate" title={cellValue(item, f)}>
                      {cellValue(item, f)}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-link text-xs font-medium hover:underline"
                      onClick={() => onViewRequest(item._id)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-3">
          <button
            type="button"
            className="btn-outline text-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span className="text-sm text-text-muted">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="btn-outline text-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
