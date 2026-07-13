import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Link as RouterLink } from 'react-router-dom';
import { employeesApi } from '../api/employees';
import { employeeChangeRequestsApi } from '../api/employeeChangeRequests';
import { downloadEmployeeCsvTemplate, uploadEmployeeCsv, type CsvImportResult } from '../api/csvImport';
import { useAuth } from '../store/auth';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { CollapsibleInfoBox } from '../components/ui/CollapsibleInfoBox';
import { EMPTY_CELL, fmtDate } from '../lib/format';
import { EmployeesAddModal } from './EmployeesAddModal';
import { EmployeeDeleteModal } from './EmployeeDeleteModal';
import { EmployeeCardList } from '../components/employees/EmployeeCardList';
import { MobileFilterBar } from '../components/ui/MobileFilterBar';
import { useActivityLog } from '../hooks/useActivityLog';
import { usePageTourController } from '../hooks/usePageTourController';
import { GiveMeATourButton } from '../components/onboarding/GiveMeATourButton';
import { employeesTourScript } from '../lib/onboarding/scripts/employeesTourScript';
import type { TourPageApi } from '../lib/onboarding/tourTypes';
import type { EmployeeMasked } from '@mams/types';
import { SortableTh, TABLE_HEADER_TH_CLASS } from '../components/ui/SortableTh';
import { TablePagination } from '../components/ui/TablePagination';
import { nextSortState, sortArrowFor, type SortDir } from '../lib/tableSort';
import { tableColumnTooltip } from '../lib/tooltips/tableColumnTooltips';

import { ACTIVITY_QUERY_PREFIX } from '../api/activity';
import { useBulkSelection } from '../hooks/useBulkSelection';
import { BulkActionBar } from '../components/ui/BulkActionBar';
import { BulkConfirmModal } from '../components/ui/BulkConfirmModal';
import { BulkSelectCheckbox } from '../components/ui/BulkSelectCheckbox';
import type { BulkMutationResult } from '@mams/types';

const EMPLOYEES_DEFAULT_SORT = { col: 'empCode' as const, dir: 'asc' as const };

export function Employees() {
  const { logSearch } = useActivityLog();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'name' | 'empCode' | 'department' | 'status' | 'joinDate'>('empCode');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<EmployeeMasked | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<EmployeeMasked | null>(null);
  const [deleteRequestEmployee, setDeleteRequestEmployee] = useState<EmployeeMasked | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkRequestOpen, setBulkRequestOpen] = useState(false);
  const bulk = useBulkSelection();
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();
  const pageSize = 50;
  const user = useAuth((s) => s.user);
  const isCompliant = user?.viewMode === 'compliant';
  const canManage = user?.permissions.includes('manage.employees') || user?.permissions.includes('manage.users') || false;
  const canWriteChangeRequest = user?.permissions.includes('write.employee_change') ?? false;
  const canEdit = canManage || canWriteChangeRequest;
  const pageApiRef = useRef<TourPageApi>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ['employees', { search, page, sortBy, sortDir }],
    queryFn: () => employeesApi.list({ search, page, pageSize, sortBy, sortDir }),
  });

  const toggleSort = useCallback((col: string) => {
    const next = nextSortState(
      col,
      { col: sortBy, dir: sortDir },
      EMPLOYEES_DEFAULT_SORT
    );
    setSortBy((next.col ?? EMPLOYEES_DEFAULT_SORT.col) as typeof sortBy);
    setSortDir(next.dir);
    setPage(1);
  }, [sortBy, sortDir]);

  const sortArrow = useCallback((col: string) => sortArrowFor(col, sortBy, sortDir), [sortBy, sortDir]);

  const { data: flaggedRequests } = useQuery({
    queryKey: ['employee-change-requests', { status: 'Flagged' }],
    queryFn: () => employeeChangeRequestsApi.list({ status: 'Flagged', pageSize: 200 }),
    enabled: !isCompliant && canManage,
  });

  const tour = usePageTourController('employees', employeesTourScript, {
    pageApiRef,
    ready: !isLoading,
    onBeforeStart: () => {
      pageApiRef.current.clearSearch?.();
      pageApiRef.current.closeModals?.();
    },
  });

  pageApiRef.current = {
    clearSearch: () => {
      setSearch('');
      setPage(1);
    },
    closeModals: () => {
      setImportOpen(false);
      setAddOpen(false);
      setEditEmployee(null);
      setDeleteEmployee(null);
      setDeleteRequestEmployee(null);
    },
  };

  useEffect(() => {
    logSearch('employees', 'search', { search: search.trim() });
  }, [search, logSearch]);

  const pageItems = data?.items ?? [];
  const pageIds = useMemo(() => pageItems.map((e) => e.id), [pageItems]);
  const pageCheck = bulk.pageSelectionState(pageIds);
  const selectedEmployees = useMemo(
    () => pageItems.filter((e) => bulk.isSelected(e.id)),
    [pageItems, bulk]
  );

  useEffect(() => {
    bulk.clear();
  }, [page, search, sortBy, sortDir]);

  const tableColSpan = 8 + (isCompliant ? 0 : 1) + (canEdit ? 2 : 0);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3" data-tour-id="employees-header">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <div className="text-sm text-text-muted">
            {data ? `${data.total.toLocaleString()} total` : ''}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0 page-toolbar">
          <GiveMeATourButton onClick={tour.onReplayTour} />
        {canEdit && (
          <div className="flex flex-wrap gap-2" data-tour-id="employees-actions">
            <button type="button" className="btn-primary" onClick={() => setAddOpen(true)}>
              Add employee
            </button>
            {canManage && (
              <button type="button" className="btn-outline" onClick={() => setImportOpen(true)}>
                Import CSV
              </button>
            )}
          </div>
        )}
        </div>
      </div>

      {!isCompliant && flaggedRequests && flaggedRequests.counts.Flagged > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-md border border-amber bg-amber-bg px-4 py-3 text-sm text-amber">
          <span className="font-semibold">
            {flaggedRequests.counts.Flagged} compliance action{flaggedRequests.counts.Flagged !== 1 ? 's' : ''}{' '}
            {flaggedRequests.counts.Flagged !== 1 ? 'need' : 'needs'} your review.
          </span>
          <RouterLink to="/employee-change-requests" className="underline font-medium hover:no-underline">
            Review now
          </RouterLink>
        </div>
      )}

      <div data-tour-id="employees-search">
      <MobileFilterBar
        search={
          <input
            className="input flex-1"
            placeholder="Search by name, employee code, biometric ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        }
        desktopClassName="hidden md:flex gap-3"
        noCard
        className="mb-3"
      />
      </div>

      <div data-tour-id="employees-list">
      {canEdit && (
        <BulkActionBar
          count={bulk.count}
          overLimit={bulk.overLimit}
          actionLabel={isCompliant ? 'Request deletion' : 'Delete selected'}
          onAction={() => (isCompliant ? setBulkRequestOpen(true) : setBulkDeleteOpen(true))}
          onClear={bulk.clear}
        />
      )}
      <EmployeeCardList
        items={data?.items}
        isLoading={isLoading}
        error={!!error}
        canManage={canEdit}
        selectable={canEdit}
        isSelected={bulk.isSelected}
        onToggleSelect={bulk.toggle}
        onEdit={setEditEmployee}
        onDelete={(e) => (isCompliant ? setDeleteRequestEmployee(e) : setDeleteEmployee(e))}
      />

      <div className="card overflow-hidden hidden md:block" data-tour-id="employees-table">
        <div className="tbl-scroll">
          <table className="w-full text-sm md:min-w-[640px] xl:min-w-0">
            <thead className="bg-surface2">
              <tr className="text-left text-xs uppercase tracking-wider">
                {canEdit && (
                  <th className="px-4 py-3 w-10 !text-center">
                    <BulkSelectCheckbox
                      checked={pageCheck.allSelected && pageIds.length > 0}
                      indeterminate={pageCheck.someSelected}
                      onChange={() => bulk.togglePage(pageIds)}
                      ariaLabel="Select all employees on this page"
                    />
                  </th>
                )}
                <SortableTh label="Code" sortKey="empCode" activeCol={sortBy} sortArrow={sortArrow} onSort={toggleSort} tooltip={tableColumnTooltip('employees', 'empCode')} className="!text-center" />
                <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-200 !text-center">Biometric ID</th>
                <SortableTh label="Name" sortKey="name" activeCol={sortBy} sortArrow={sortArrow} onSort={toggleSort} tooltip={tableColumnTooltip('employees', 'name')} className="!text-center" />
                <SortableTh label="Department" sortKey="department" activeCol={sortBy} sortArrow={sortArrow} onSort={toggleSort} tooltip={tableColumnTooltip('employees', 'department')} className="!text-center" />
                <th className={`px-4 py-3 font-semibold !text-center ${TABLE_HEADER_TH_CLASS}`}>Location</th>
                <th className={`px-4 py-3 font-semibold !text-center ${TABLE_HEADER_TH_CLASS}`}>Shift</th>
                {!isCompliant && <th className={`px-4 py-3 font-semibold hidden xl:table-cell !text-center ${TABLE_HEADER_TH_CLASS}`}>Comp</th>}
                <SortableTh label="Joined" sortKey="joinDate" activeCol={sortBy} sortArrow={sortArrow} onSort={toggleSort} className="hidden xl:table-cell !text-center" tooltip={tableColumnTooltip('employees', 'joinDate')} />
                <SortableTh label="Status" sortKey="status" activeCol={sortBy} sortArrow={sortArrow} onSort={toggleSort} tooltip={tableColumnTooltip('employees', 'status')} className="!text-center" />
                {canEdit && <th className={`py-3 w-24 font-semibold !text-center ${TABLE_HEADER_TH_CLASS}`}>Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr><td colSpan={tableColSpan} className="px-4 py-10 text-center text-text-muted">Loading...</td></tr>
              )}
              {error && (
                <tr><td colSpan={tableColSpan} className="px-4 py-10 text-center text-red">Failed to load.</td></tr>
              )}
              {data?.items.map((e) => (
                <tr key={e.id} className="hover:bg-surface2/50 transition">
                  {canEdit && (
                    <td className="px-4 py-3 text-center">
                      <BulkSelectCheckbox
                        checked={bulk.isSelected(e.id)}
                        onChange={() => bulk.toggle(e.id)}
                        ariaLabel={`Select ${e.name}`}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 font-mono text-xs text-center">
                    <span className="inline-block -ml-4">{e.empCode}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-text-muted text-center">{e.biometricId}</td>
                  <td className="px-4 py-3 font-medium text-center">
                    <Link to={`/employees/${e.id}`} className="text-link font-medium hover:underline inline-block -ml-4">{e.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block -ml-4">{e.department}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted text-center">{e.location}</td>
                  <td className="px-4 py-3 text-center">{isCompliant ? e.alternateShift : e.timeShift}</td>
                  {!isCompliant && <td className="px-4 py-3 font-mono text-xs hidden xl:table-cell text-center">{e.alternateShift}</td>}
                  <td className="px-4 py-3 text-xs text-text-muted hidden xl:table-cell text-center">
                    <span className="inline-block -ml-4">{fmtDate(e.joinDate.slice(0, 10))}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block -ml-4">
                      <Badge tone={e.status === 'Active' ? 'green' : 'red'}>{e.status}</Badge>
                    </span>
                  </td>
                  {canEdit && (
                    <td className="py-3 w-24">
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          type="button"
                          className="w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:text-primary hover:bg-primary-bg transition-colors"
                          title="Edit"
                          onClick={() => setEditEmployee(e)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button
                          type="button"
                          className="w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:text-red hover:bg-red/10 transition-colors"
                          title={isCompliant ? 'Request deletion' : 'Delete'}
                          onClick={() => (isCompliant ? setDeleteRequestEmployee(e) : setDeleteEmployee(e))}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {data && data.total > pageSize && (
        <TablePagination
          page={page}
          totalPages={Math.ceil(data.total / pageSize)}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />
      )}

      {importOpen && <CsvImportModal onClose={() => setImportOpen(false)} />}
      {addOpen && <EmployeesAddModal onClose={() => setAddOpen(false)} />}
      {editEmployee && (
        <EmployeesAddModal mode="edit" employee={editEmployee} onClose={() => setEditEmployee(null)} />
      )}
      {deleteEmployee && (
        <EmployeeDeleteModal employee={deleteEmployee} onClose={() => setDeleteEmployee(null)} />
      )}
      {deleteRequestEmployee && (
        <EmployeeDeleteRequestModal employee={deleteRequestEmployee} onClose={() => setDeleteRequestEmployee(null)} />
      )}
      <BulkConfirmModal
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        title="Delete selected employees?"
        description={
          <>
            Delete <strong>{bulk.count}</strong> employee{bulk.count !== 1 ? 's' : ''}? This cannot be undone.
          </>
        }
        itemLabels={selectedEmployees.map((e) => `${e.name} (${e.empCode})`)}
        confirmLabel="Delete employees"
        onConfirm={async () => {
          const result = await employeesApi.bulkDelete(bulk.ids);
          toast(
            `Deleted ${result.succeeded} employee${result.succeeded !== 1 ? 's' : ''}${
              result.skipped ? `, ${result.skipped} skipped` : ''
            }`,
            result.succeeded > 0 ? 'success' : 'error'
          );
          qc.invalidateQueries({ queryKey: ['employees'] });
          qc.invalidateQueries({ queryKey: ACTIVITY_QUERY_PREFIX });
          bulk.clear();
          return result;
        }}
      />
      {bulkRequestOpen && (
        <EmployeeBulkDeleteRequestModal
          count={bulk.count}
          itemLabels={selectedEmployees.map((e) => `${e.name} (${e.empCode})`)}
          employeeIds={bulk.ids}
          onClose={() => setBulkRequestOpen(false)}
          onSuccess={() => {
            bulk.clear();
            setBulkRequestOpen(false);
          }}
        />
      )}
    </div>
  );
}

function CsvImportModal({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();

  const onDownloadTemplate = async () => {
    setTemplateBusy(true);
    try {
      await downloadEmployeeCsvTemplate();
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Could not download template', 'error');
    } finally {
      setTemplateBusy(false);
    }
  };

  const onUpload = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const res = await uploadEmployeeCsv(text);
      setResult(res);
      toast(`Imported ${res.successCount} of ${res.totalRows} rows`, res.successCount > 0 ? 'success' : 'error');
      qc.invalidateQueries({ queryKey: ['employees'] });
      if (res.successCount > 0) {
        qc.invalidateQueries({ queryKey: ['employees', 'next-code'] });
        qc.invalidateQueries({ queryKey: ACTIVITY_QUERY_PREFIX });
      }
    } catch (e: any) {
      toast(e?.message ?? 'Import failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Bulk Import Employees from CSV"
      size="lg"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>{result ? 'Close' : 'Cancel'}</button>
          {!result && (
            <button
              className="btn-primary"
              disabled={!file || busy}
              onClick={onUpload}
            >
              {busy ? 'Importing...' : 'Import'}
            </button>
          )}
        </>
      }
    >
      {!result && (
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-surface2/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Step 1: template</div>
            <button
              type="button"
              className="btn-primary w-full sm:w-auto"
              disabled={templateBusy}
              onClick={onDownloadTemplate}
            >
              {templateBusy ? 'Preparing...' : 'Download blank template (.csv)'}
            </button>
            <p className="mt-3 text-xs text-text-muted">
              <button
                type="button"
                className="text-link font-semibold underline hover:no-underline"
                disabled={templateBusy}
                onClick={onDownloadTemplate}
              >
                Download again
              </button>
            </p>
          </div>

          <div className="rounded-md border border-border bg-surface2/40 p-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
              Step 2: choose CSV file
            </label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-light"
            />
            {file && (
              <div className="mt-2 text-xs text-text-muted">
                Selected: <span className="font-mono">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <CollapsibleInfoBox storageKey="mams-csv-import-rules-collapsed" title="Before you import">
            <ol className="list-decimal pl-5 space-y-1 text-xs">
              <li>Header row must match the template exactly - don't rename, reorder, or remove columns.</li>
              <li>
                <span className="font-semibold">empCode</span>: unique; format <span className="font-mono">MKS</span> + four digits (e.g. <span className="font-mono">MKS0042</span>).
              </li>
              <li>
                <span className="font-semibold">joinDate</span>: format <span className="font-mono">YYYY-MM-DD</span>.
              </li>
              <li>
                <span className="font-semibold">gender</span>: M, F, or O.
              </li>
              <li>
                <span className="font-semibold">timeShift</span>: Day or Night.
              </li>
              <li>
                <span className="font-semibold">alternateShift</span>: A, B, or C.
              </li>
              <li>
                <span className="font-semibold">weeklyOff</span>: one or two weekdays, separated by semicolons (e.g. <span className="font-mono">Saturday;Sunday</span>).
              </li>
              <li>
                <span className="font-semibold">biometricId</span>: unique; must exactly match the device-enrolled user
                ID as a string (e.g. device sends <span className="font-mono">42</span> &rarr; CSV must say{' '}
                <span className="font-mono">42</span>, not <span className="font-mono">BIO042</span>, unless the
                device itself uses that format).
              </li>
              <li>
                <span className="font-semibold">pan</span>: five letters + four digits + one letter (e.g. <span className="font-mono">AAAAA0000A</span>).
              </li>
              <li>
                <span className="font-semibold">ifsc</span>: valid 11-character bank code (e.g. <span className="font-mono">AAAA0XXXXXX</span>).
              </li>
              <li>
                <span className="font-semibold">aadhaar</span>: exactly 12 digits (format check only in Phase 1).
              </li>
              <li>
                <span className="font-semibold">bankAccountNumber</span>: 9-18 digits.
              </li>
              <li>
                <span className="font-semibold">esiNumber</span>: 10 or 17 digits.
              </li>
              <li>
                <span className="font-semibold">accountType</span>: Savings, Current, or Salary.
              </li>
              <li>
                <span className="font-semibold">pfNumber</span>: letters, digits, slashes, dots, hyphens, spaces (5-40 characters).
              </li>
            </ol>
          </CollapsibleInfoBox>

          <div className="text-xs text-text-muted bg-amber-bg text-amber px-3 py-2 rounded">
            Rows with data issues (duplicate codes, invalid PAN/IFSC, etc.) are flagged in the import report, not
            auto-corrected - review your CSV against the rules above before importing.
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="dash-stat-grid">
            <ResultStat label="Total Rows" value={result.totalRows} />
            <ResultStat label="Imported" value={result.successCount} tone="green" />
            <ResultStat label="Duplicates" value={result.duplicateCount} tone="amber" />
            <ResultStat label="Invalid" value={result.invalidCount} tone="red" />
          </div>

          {result.errors.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wider text-text-subtle mb-2 font-semibold">
                Rejected rows ({result.errors.length})
              </div>
              <div className="border border-border rounded max-h-60 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-surface2 sticky top-0">
                    <tr className="text-left">
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Emp Code</th>
                      <th className="px-3 py-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.errors.map((e, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-mono">{e.rowIndex}</td>
                        <td className="px-3 py-2 font-mono">{e.empCode || EMPTY_CELL}</td>
                        <td className="px-3 py-2 text-red">{e.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function EmployeeBulkDeleteRequestModal({
  count,
  itemLabels,
  employeeIds,
  onClose,
  onSuccess,
}: {
  count: number;
  itemLabels: string[];
  employeeIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();

  const onConfirm = async () => {
    if (reason.trim().length < 10) {
      setError('Reason must be at least 10 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    const result: BulkMutationResult = { succeeded: 0, skipped: 0, errors: [] };
    try {
      for (const employeeId of employeeIds) {
        try {
          await employeeChangeRequestsApi.submit({
            changeType: 'delete',
            employeeId,
            reason: reason.trim(),
          });
          result.succeeded += 1;
        } catch (e: unknown) {
          result.skipped += 1;
          result.errors.push({
            id: employeeId,
            reason: e instanceof Error ? e.message : 'Could not submit request',
          });
        }
      }
      toast(
        `Deleted ${result.succeeded} employee${result.succeeded !== 1 ? 's' : ''}${
          result.skipped ? `, ${result.skipped} skipped` : ''
        }`,
        result.succeeded > 0 ? 'success' : 'error'
      );
      qc.invalidateQueries({ queryKey: ['employee-change-requests'] });
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not delete employees.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Delete employees"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="btn-primary bg-red hover:bg-red/90" disabled={busy || reason.trim().length < 10} onClick={onConfirm}>
            {busy ? 'Deleting…' : `Delete ${count} employee${count !== 1 ? 's' : ''}`}
          </button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <p className="text-text-muted">
          Delete <strong className="text-text">{count}</strong> employee{count !== 1 ? 's' : ''}? This cannot be undone.
        </p>
        {itemLabels.length > 0 && (
          <ul className="list-disc pl-5 text-text-muted space-y-0.5">
            {itemLabels.slice(0, 5).map((label) => (
              <li key={label}>{label}</li>
            ))}
            {itemLabels.length > 5 && (
              <li className="list-none -ml-5 text-text-subtle">…and {itemLabels.length - 5} more</li>
            )}
          </ul>
        )}
        <div>
          <label className="label">Reason</label>
          <textarea
            className={`input w-full min-h-[80px] resize-y ${error ? 'ring-1 ring-red' : ''}`}
            placeholder="Describe why these employees should be removed (min 10 characters)"
            value={reason}
            onChange={(e) => { setReason(e.target.value); setError(null); }}
          />
          {error && <p className="mt-1 text-[11px] text-red">{error}</p>}
        </div>
      </div>
    </Modal>
  );
}

function EmployeeDeleteRequestModal({ employee, onClose }: { employee: EmployeeMasked; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast((s) => s.push);
  const qc = useQueryClient();

  const onConfirm = async () => {
    if (reason.trim().length < 10) {
      setError('Reason must be at least 10 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await employeeChangeRequestsApi.submit({ changeType: 'delete', employeeId: employee.id, reason: reason.trim() });
      toast(`Deleted ${employee.name}`, 'success');
      qc.invalidateQueries({ queryKey: ['employee-change-requests'] });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not delete employee.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Delete employee?"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="btn-primary bg-red hover:bg-red/90" disabled={busy || reason.trim().length < 10} onClick={onConfirm}>
            {busy ? 'Deleting…' : 'Delete employee'}
          </button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <p className="text-text-muted">
          Delete employee <strong className="text-text">{employee.name}</strong> ({employee.empCode})? This cannot be undone.
        </p>
        <div>
          <label className="label">Reason</label>
          <textarea
            className={`input w-full min-h-[80px] resize-y ${error ? 'ring-1 ring-red' : ''}`}
            placeholder="Describe why this employee should be removed (min 10 characters)"
            value={reason}
            onChange={(e) => { setReason(e.target.value); setError(null); }}
          />
          {error && <p className="mt-1 text-[11px] text-red">{error}</p>}
        </div>
      </div>
    </Modal>
  );
}

function ResultStat({ label, value, tone }: { label: string; value: number; tone?: 'green' | 'amber' | 'red' }) {
  const accent = tone ?? 'primary';
  return (
    <div className={`dash-stat-card accent-${accent} h-full !cursor-default pointer-events-none`}>
      <div className="dash-stat-card-label">{label}</div>
      <div className="dash-stat-value text-2xl md:text-3xl font-bold my-1 md:my-1.5 leading-none">{value}</div>
      <div className="dash-stat-card-sub">{'\u00A0'}</div>
    </div>
  );
}
