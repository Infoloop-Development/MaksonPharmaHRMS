import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { employeesApi } from '../api/employees';
import { downloadEmployeeCsvTemplate, uploadEmployeeCsv, type CsvImportResult } from '../api/csvImport';
import { useAuth } from '../store/auth';
import { useToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { fmtDate } from '../lib/format';
import { EmployeesAddModal } from './EmployeesAddModal';
import { BiometricIdBanner } from '../components/goLive/BiometricIdBanner';
import { EmployeeCardList } from '../components/employees/EmployeeCardList';
import { MobileFilterBar } from '../components/ui/MobileFilterBar';
import { useActivityLog } from '../hooks/useActivityLog';
import { usePageTourController } from '../hooks/usePageTourController';
import { GiveMeATourButton } from '../components/onboarding/GiveMeATourButton';
import { employeesTourScript } from '../lib/onboarding/scripts/employeesTourScript';
import type { TourPageApi } from '../lib/onboarding/tourTypes';
import { ACTIVITY_QUERY_PREFIX } from '../api/activity';

export function Employees() {
  const { logSearch } = useActivityLog();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const pageSize = 50;
  const user = useAuth((s) => s.user);
  const isCompliant = user?.viewMode === 'compliant';
  const canManage = user?.permissions.includes('manage.employees') || user?.permissions.includes('manage.users') || false;
  const pageApiRef = useRef<TourPageApi>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ['employees', { search, page }],
    queryFn: () => employeesApi.list({ search, page, pageSize }),
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
    },
  };

  useEffect(() => {
    logSearch('employees', 'search', { search: search.trim() });
  }, [search, logSearch]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3" data-tour-id="employees-header">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <div className="text-sm text-text-muted">
            {data ? `${data.total.toLocaleString()} total` : ''}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <GiveMeATourButton onClick={tour.onReplayTour} />
        {canManage && (
          <div className="flex flex-wrap gap-2" data-tour-id="employees-actions">
            <button type="button" className="btn-primary" onClick={() => setAddOpen(true)}>
              Add employee
            </button>
            <button type="button" className="btn-outline" onClick={() => setImportOpen(true)}>
              Import CSV
            </button>
          </div>
        )}
        </div>
      </div>

      {canManage && (
        <div data-tour-id="employees-biometric-banner">
          <BiometricIdBanner />
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
      <EmployeeCardList items={data?.items} isLoading={isLoading} error={!!error} />

      <div className="card overflow-hidden hidden md:block" data-tour-id="employees-table">
        <div className="tbl-scroll">
          <table className="w-full text-sm md:min-w-[640px] xl:min-w-0">
            <thead className="bg-surface2">
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Biometric ID</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Department</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Shift</th>
                {!isCompliant && <th className="px-4 py-3 font-semibold hidden xl:table-cell">Comp</th>}
                <th className="px-4 py-3 font-semibold hidden xl:table-cell">Joined</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr><td colSpan={isCompliant ? 8 : 9} className="px-4 py-10 text-center text-text-muted">Loading...</td></tr>
              )}
              {error && (
                <tr><td colSpan={isCompliant ? 8 : 9} className="px-4 py-10 text-center text-red">Failed to load.</td></tr>
              )}
              {data?.items.map((e) => (
                <tr key={e.id} className="hover:bg-surface2/50 transition">
                  <td className="px-4 py-3 font-mono text-xs">{e.empCode}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-muted">{e.biometricId}</td>
                  <td className="px-4 py-3 font-medium">
                    <Link to={`/employees/${e.id}`} className="text-primary hover:underline">{e.name}</Link>
                  </td>
                  <td className="px-4 py-3">{e.department}</td>
                  <td className="px-4 py-3 text-xs text-text-muted">{e.location}</td>
                  <td className="px-4 py-3">{isCompliant ? e.alternateShift : e.timeShift}</td>
                  {!isCompliant && <td className="px-4 py-3 font-mono text-xs hidden xl:table-cell">{e.alternateShift}</td>}
                  <td className="px-4 py-3 text-xs text-text-muted hidden xl:table-cell">{fmtDate(e.joinDate.slice(0, 10))}</td>
                  <td className="px-4 py-3">
                    <Badge tone={e.status === 'Active' ? 'green' : 'red'}>{e.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {data && data.total > pageSize && (
        <div className="mt-4 flex items-center justify-between text-sm" data-tour-id="employees-pagination">
          <div className="text-text-muted">
            Page {page} of {Math.ceil(data.total / pageSize)}
          </div>
          <div className="flex gap-2">
            <button className="btn-outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</button>
            <button className="btn-outline" onClick={() => setPage(p => p + 1)} disabled={page * pageSize >= data.total}>Next</button>
          </div>
        </div>
      )}

      {importOpen && <CsvImportModal onClose={() => setImportOpen(false)} />}
      {addOpen && <EmployeesAddModal onClose={() => setAddOpen(false)} />}
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
                className="text-primary font-semibold underline hover:no-underline"
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
