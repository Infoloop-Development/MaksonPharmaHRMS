import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Link as RouterLink } from 'react-router-dom';
import { employeesApi } from '../api/employees';
import { employeeChangeRequestsApi } from '../api/employeeChangeRequests';
import { downloadEmployeeCsvTemplate, uploadEmployeeCsv, type CsvImportResult } from '../api/csvImport';
import { useAuth } from '../store/auth';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { fmtDate } from '../lib/format';
import { EmployeesAddModal } from './EmployeesAddModal';
import { EmployeeDeleteModal } from './EmployeeDeleteModal';
import { BiometricIdBanner } from '../components/goLive/BiometricIdBanner';
import { EmployeeCardList } from '../components/employees/EmployeeCardList';
import { MobileFilterBar } from '../components/ui/MobileFilterBar';
import { useActivityLog } from '../hooks/useActivityLog';
import { usePageTourController } from '../hooks/usePageTourController';
import { GiveMeATourButton } from '../components/onboarding/GiveMeATourButton';
import { employeesTourScript } from '../lib/onboarding/scripts/employeesTourScript';
import type { TourPageApi } from '../lib/onboarding/tourTypes';
import type { EmployeeMasked } from '@mams/types';
import { SortableTh } from '../components/ui/SortableTh';
import { TablePagination } from '../components/ui/TablePagination';
import { sortArrowFor, type SortDir } from '../lib/tableSort';

import { ACTIVITY_QUERY_PREFIX } from '../api/activity';

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
    const key = col as typeof sortBy;
    setSortBy((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return key;
      }
      setSortDir('asc');
      return key;
    });
    setPage(1);
  }, []);

  const sortArrow = useCallback((col: string) => sortArrowFor(col, sortBy, sortDir), [sortBy, sortDir]);

  const { data: pendingRequests } = useQuery({
    queryKey: ['employee-change-requests', { status: 'Pending' }],
    queryFn: () => employeeChangeRequestsApi.list({ status: 'Pending', pageSize: 200 }),
    enabled: isCompliant,
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

  const tableColSpan = 8 + (isCompliant ? 0 : 1) + (canEdit ? 1 : 0);

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
              {isCompliant ? 'Request new employee' : 'Add employee'}
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

      {canManage && !isCompliant && (
        <div data-tour-id="employees-biometric-banner">
          <BiometricIdBanner />
        </div>
      )}

      {isCompliant && pendingRequests && pendingRequests.counts.Pending > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-md border border-amber bg-amber-bg px-4 py-3 text-sm text-amber">
          <span className="font-semibold">
            {pendingRequests.counts.Pending} change request{pendingRequests.counts.Pending !== 1 ? 's' : ''} pending HR review.
          </span>
          <RouterLink to="/employee-change-requests" className="underline font-medium hover:no-underline">
            View requests
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
      />
      </div>

      <div data-tour-id="employees-list">
      <EmployeeCardList
        items={data?.items}
        isLoading={isLoading}
        error={!!error}
        canManage={canEdit}
        onEdit={setEditEmployee}
        onDelete={(e) => (isCompliant ? setDeleteRequestEmployee(e) : setDeleteEmployee(e))}
      />

      <div className="card overflow-hidden hidden md:block" data-tour-id="employees-table">
        <div className="tbl-scroll">
          <table className="w-full text-sm md:min-w-[640px] xl:min-w-0">
            <thead className="bg-surface2">
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                <SortableTh label="Code" sortKey="empCode" activeCol={sortBy} sortArrow={sortArrow} onSort={toggleSort} />
                <th className="px-4 py-3 font-semibold">Biometric ID</th>
                <SortableTh label="Name" sortKey="name" activeCol={sortBy} sortArrow={sortArrow} onSort={toggleSort} />
                <SortableTh label="Department" sortKey="department" activeCol={sortBy} sortArrow={sortArrow} onSort={toggleSort} />
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Shift</th>
                {!isCompliant && <th className="px-4 py-3 font-semibold hidden xl:table-cell">Comp</th>}
                <SortableTh label="Joined" sortKey="joinDate" activeCol={sortBy} sortArrow={sortArrow} onSort={toggleSort} className="hidden xl:table-cell" />
                <SortableTh label="Status" sortKey="status" activeCol={sortBy} sortArrow={sortArrow} onSort={toggleSort} />
                {canEdit && <th className="px-4 py-3 font-semibold text-right">Actions</th>}
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
                  <td className="px-4 py-3 font-mono text-xs">{e.empCode}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-muted">{e.biometricId}</td>
                  <td className="px-4 py-3 font-medium">
                    <Link to={`/employees/${e.id}`} className="text-link font-medium hover:underline">{e.name}</Link>
                  </td>
                  <td className="px-4 py-3">{e.department}</td>
                  <td className="px-4 py-3 text-xs text-text-muted">{e.location}</td>
                  <td className="px-4 py-3">{isCompliant ? e.alternateShift : e.timeShift}</td>
                  {!isCompliant && <td className="px-4 py-3 font-mono text-xs hidden xl:table-cell">{e.alternateShift}</td>}
                  <td className="px-4 py-3 text-xs text-text-muted hidden xl:table-cell">{fmtDate(e.joinDate.slice(0, 10))}</td>
                  <td className="px-4 py-3">
                    <Badge tone={e.status === 'Active' ? 'green' : 'red'}>{e.status}</Badge>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" className="btn-outline btn-sm" onClick={() => setEditEmployee(e)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-outline btn-sm text-red"
                          onClick={() => (isCompliant ? setDeleteRequestEmployee(e) : setDeleteEmployee(e))}
                        >
                          Delete
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
            <div className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Step 1 — template</div>
            <button
              type="button"
              className="btn-primary w-full sm:w-auto"
              disabled={templateBusy}
              onClick={onDownloadTemplate}
            >
              {templateBusy ? 'Preparing…' : 'Download blank template (.csv)'}
            </button>
            <p className="mt-2 text-xs text-text-muted">
              Uses your login session so the file downloads correctly. Opens your browser&apos;s save dialog as{' '}
              <span className="font-mono">mams-employee-import-template.csv</span>.
              {' '}
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

          <div className="p-4 bg-primary-bg rounded-md text-sm">
            <div className="font-semibold mb-1">Before you import</div>
            <ol className="list-decimal pl-5 space-y-1 text-xs">
              <li>Do not change or reorder the header row — column names must match the template exactly.</li>
              <li>
                <span className="font-mono">empCode</span>: unique, format <span className="font-mono">MKS</span> + four digits (e.g. <span className="font-mono">MKS0042</span>).
              </li>
              <li>
                <span className="font-mono">joinDate</span> as <span className="font-mono">YYYY-MM-DD</span>; <span className="font-mono">gender</span> one of <span className="font-mono">M</span>, <span className="font-mono">F</span>, <span className="font-mono">O</span>.
              </li>
              <li>
                <span className="font-mono">timeShift</span> <span className="font-mono">Day</span> or <span className="font-mono">Night</span>; <span className="font-mono">alternateShift</span> <span className="font-mono">A</span>, <span className="font-mono">B</span>, or <span className="font-mono">C</span>.
              </li>
              <li>
                <span className="font-mono">weeklyOff</span>: one or two weekdays; multiple days separated with semicolons (e.g. <span className="font-mono">Saturday;Sunday</span>).
              </li>
              <li>
                <span className="font-mono">biometricId</span> must be unique and must match the user ID enrolled on
                each biometric device (exact string — e.g. device sends <span className="font-mono">42</span>, CSV must
                be <span className="font-mono">42</span>, not <span className="font-mono">BIO042</span> unless the device
                uses that).
              </li>
              <li>
                PAN: five letters + four digits + one letter (<span className="font-mono">AAAAA0000A</span>); IFSC: valid 11-character bank code (<span className="font-mono">AAAA0XXXXXX</span>).
              </li>
              <li>
                Aadhaar: exactly 12 digits (format only in Phase 1); bank account: 9–18 digits; ESI: 10 or 17 digits.
              </li>
              <li>
                <span className="font-mono">accountType</span>: <span className="font-mono">Savings</span>, <span className="font-mono">Current</span>, or <span className="font-mono">Salary</span>; PF number: letters, digits, slashes, dots, hyphens, spaces (min 5, max 40 characters).
              </li>
            </ol>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
              Step 2 — choose CSV file
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

          <div className="text-xs text-text-muted bg-amber-bg text-amber px-3 py-2 rounded">
            Data discrepancies (duplicate codes, invalid PAN/IFSC) will be flagged in the report. Source-data integrity is your responsibility — we do not silently fix.
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
                        <td className="px-3 py-2 font-mono">{e.empCode || '—'}</td>
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
      toast('Deletion request submitted for HR review', 'success');
      qc.invalidateQueries({ queryKey: ['employee-change-requests'] });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not submit request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Request employee deletion"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="btn-primary bg-red hover:bg-red/90" disabled={busy || reason.trim().length < 10} onClick={onConfirm}>
            {busy ? 'Submitting…' : 'Submit request'}
          </button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <p className="text-text-muted">
          Request deletion of <strong className="text-text">{employee.name}</strong> ({employee.empCode}). HR must approve before the record is removed.
        </p>
        <div>
          <label className="label">Reason</label>
          <textarea
            className={`input w-full min-h-[80px] resize-y ${error ? 'ring-1 ring-red' : ''}`}
            placeholder="Describe why this employee should be removed (min 10 characters)…"
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
  const tones: Record<'green' | 'amber' | 'red', string> = {
    green: 'bg-green-bg text-green-on-bg',
    amber: 'bg-amber-bg text-amber',
    red: 'bg-red-bg text-red',
  };
  const colour = tone ? tones[tone] : 'bg-surface2 text-text';
  return (
    <div className={`p-3 rounded ${colour}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
