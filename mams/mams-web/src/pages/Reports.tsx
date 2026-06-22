import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useActivityLog } from '../hooks/useActivityLog';
import { reportsApi } from '../api/reports';
import { settingsApi } from '../api/settings';
import { formatReportDateRange } from '../components/reports/ReportPrintHeader';
import { brandingFromSettings } from '../lib/companyBranding';
import { openReportPrintWindow } from '../lib/reportPrintDocument';
import { useAuth } from '../store/auth';
import { useToast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';
import { Field, Input, Select } from '../components/ui/Field';
import { DailyReportCardList } from '../components/reports/DailyReportCardList';
import { MonthlyReportCardList } from '../components/reports/MonthlyReportCardList';
import { DepartmentReportCardList } from '../components/reports/DepartmentReportCardList';
import { fmtDate, fmtHours, fmtNumber } from '../lib/format';
import { useTimeDisplay } from '../store/timeFormat';
import { MobileFilterBar } from '../components/ui/MobileFilterBar';
import { countActiveFilters } from '../lib/countActiveFilters';
import { usePageTourController } from '../hooks/usePageTourController';
import { GiveMeATourButton } from '../components/onboarding/GiveMeATourButton';
import { reportsTourScript } from '../lib/onboarding/scripts/reportsTourScript';

type Tab = 'daily' | 'monthly' | 'department' | 'location';

const DEPARTMENTS = ['Confectionery', 'Tablet Manufacturing', 'Liquid Manufacturing', 'Packaging', 'Quality Control', 'R&D', 'Maintenance', 'Warehouse', 'Admin', 'HR', 'Finance', 'Logistics'];
const LOCATIONS = ['Surendranagar, GJ', 'Mandideep, MP', 'Gummadidala, TG', 'Morbi, GJ', 'Aurangabad, MH'];

export function Reports() {
  const [tab, setTab] = useState<Tab>('daily');
  const { logReportsAction } = useActivityLog();
  const viewMode = useAuth((s) => s.user?.viewMode);
  const isCompliant = viewMode === 'compliant';
  const tour = usePageTourController('reports', reportsTourScript, { ready: true });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3" data-tour-id="reports-header">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Reports</h1>
        </div>
        <GiveMeATourButton onClick={tour.onReplayTour} />
      </div>

      <div className="card mb-4 p-1.5 inline-flex gap-1 flex-wrap" data-tour-id="reports-tabs">
        {[
          ['daily', 'Daily Attendance'],
          ['monthly', 'Monthly Summary'],
          ['department', 'Department-wise'],
          ['location', 'Location-wise'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              const next = key as Tab;
              setTab(next);
              logReportsAction('ui.reports.filter', { tab: next });
            }}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
              tab === key ? 'bg-primary text-white' : 'text-text-muted hover:bg-surface2'
            }`}
          >
            {label}
          </button>
        ))}
        <span className="sr-only" data-tour-id="reports-monthly-hint" aria-hidden="true" />
      </div>

      {tab === 'daily' && <DailyReport isCompliant={isCompliant} />}
      {tab === 'monthly' && <MonthlyReport />}
      {tab === 'department' && <DepartmentReport />}
      {tab === 'location' && <LocationReport />}
    </div>
  );
}

function DailyReport({ isCompliant }: { isCompliant: boolean }) {
  const { logReportsAction } = useActivityLog();
  const { fmtTime } = useTimeDisplay();
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(sevenDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const toast = useToast((s) => s.push);

  const logDailyFilter = (patch: Partial<{ startDate: string; endDate: string; department: string; location: string }>) => {
    logReportsAction('ui.reports.filter', {
      tab: 'daily',
      startDate: patch.startDate ?? startDate,
      endDate: patch.endDate ?? endDate,
      department: (patch.department ?? department) || undefined,
      location: (patch.location ?? location) || undefined,
    });
  };

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get, staleTime: 60_000 });

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'daily', startDate, endDate, department, location],
    queryFn: () => reportsApi.daily({ startDate, endDate, department: department || undefined, location: location || undefined }),
  });

  const branding = brandingFromSettings(settings);

  const onPrint = () => {
    if (!data?.rows.length) {
      toast('No records to print', 'error');
      return;
    }
    logReportsAction('ui.reports.print', {
      tab: 'daily',
      startDate,
      endDate,
      department: department || undefined,
      location: location || undefined,
    });
    const opened = openReportPrintWindow({
      branding,
      title: 'Daily Attendance Report',
      subtitle: formatReportDateRange(startDate, endDate),
      summaryLine: `${data.summary.total} records · ${data.summary.present} present · ${data.summary.absent} absent · ${data.summary.weeklyOff} weekly off`,
      columns: [
        { key: 'date', label: 'Date', mono: true },
        { key: 'code', label: 'Code', mono: true },
        { key: 'name', label: 'Name' },
        { key: 'department', label: 'Department' },
        { key: 'location', label: 'Location' },
        { key: 'entry', label: 'Entry', mono: true },
        { key: 'exit', label: 'Exit', mono: true },
        { key: 'hours', label: isCompliant ? 'Hours' : 'Net Hrs', mono: true },
        ...(isCompliant ? [] : [{ key: 'ot', label: 'OT', mono: true }]),
        { key: 'status', label: 'Status' },
      ],
      rows: data.rows.map((r) => {
        const emp = r.employeeId;
        const entry = isCompliant ? r.compliantEntryAt : r.realEntryAt;
        const exit = isCompliant ? r.compliantExitAt : r.realExitAt;
        const hrs = isCompliant ? r.compliantHours : r.realNetHours;
        const row: Record<string, string | number> = {
          date: fmtDate(r.date),
          code: emp?.empCode ?? '—',
          name: emp?.name ?? '—',
          department: emp?.department ?? '—',
          location: emp?.location ?? '—',
          entry: entry ? fmtTime(entry) : '—',
          exit: exit ? fmtTime(exit) : '—',
          hours: typeof hrs === 'number' ? fmtHours(hrs) : '—',
          status: r.status ?? '—',
        };
        if (!isCompliant) row.ot = r.otHours ? fmtHours(r.otHours) : '—';
        return row;
      }),
    });
    if (!opened) toast('Could not start print. Please try again.', 'error');
  };

  const onDownloadCsv = () => {
    logReportsAction('ui.reports.export_csv', {
      tab: 'daily',
      startDate,
      endDate,
      department: department || undefined,
      location: location || undefined,
    });
    const url = reportsApi.dailyCsvUrl({ startDate, endDate, department: department || undefined, location: location || undefined });
    const a = document.createElement('a');
    a.href = url;
    a.click();
    toast('CSV download started', 'success');
  };

  const dailyFilterDefaults = { startDate: sevenDaysAgo, endDate: today, department: '', location: '' };

  return (
    <div>
      <div data-tour-id="reports-filters">
      <FilterBar
        activeCount={countActiveFilters({ startDate, endDate, department, location }, dailyFilterDefaults)}
        onClear={() => {
          setStartDate(sevenDaysAgo);
          setEndDate(today);
          setDepartment('');
          setLocation('');
        }}
      >
        <Field label="From"><Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); logDailyFilter({ startDate: e.target.value }); }} /></Field>
        <Field label="To"><Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); logDailyFilter({ endDate: e.target.value }); }} /></Field>
        <Field label="Department">
          <Select value={department} onChange={(e) => { setDepartment(e.target.value); logDailyFilter({ department: e.target.value }); }}>
            <option value="">All</option>
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </Select>
        </Field>
        <Field label="Location">
          <Select value={location} onChange={(e) => { setLocation(e.target.value); logDailyFilter({ location: e.target.value }); }}>
            <option value="">All</option>
            {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
          </Select>
        </Field>
      </FilterBar>
      </div>

      <div data-tour-id="reports-results">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div className="text-sm text-text-muted flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{isLoading ? 'Loading...' : `${data?.summary.total ?? 0} records`}</span>
          {data && (
            <>
              <Badge tone="green">{data.summary.present} present</Badge>
              <Badge tone="red">{data.summary.absent} absent</Badge>
              <Badge tone="gray">{data.summary.weeklyOff} weekly off</Badge>
            </>
          )}
        </div>
        <div className="flex gap-2 w-full sm:w-auto no-print" data-tour-id="reports-export">
          <button type="button" className="btn-outline flex-1 sm:flex-none" onClick={onPrint}>Print to PDF</button>
          <button type="button" className="btn-primary flex-1 sm:flex-none" onClick={onDownloadCsv}>Download CSV</button>
        </div>
      </div>

      <DailyReportCardList rows={data?.rows} isLoading={isLoading} isCompliant={isCompliant} />

      {data && data.rows.length > 500 && (
        <div className="mb-2 p-3 text-center text-xs text-text-muted bg-surface2 rounded-md md:hidden print:hidden">
          Showing first 500 rows. Download CSV for full export.
        </div>
      )}

      <div className="card overflow-hidden hidden md:block">
        <div className="tbl-scroll">
          <table className="w-full text-sm md:min-w-[640px] xl:min-w-0">
            <thead className="bg-surface2">
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold hidden lg:table-cell">Dept</th>
                <th className="px-4 py-3 font-semibold hidden xl:table-cell">Location</th>
                <th className="px-4 py-3 font-semibold">Entry</th>
                <th className="px-4 py-3 font-semibold">Exit</th>
                <th className="px-4 py-3 font-semibold">{isCompliant ? 'Hours' : 'Net Hrs'}</th>
                {!isCompliant && <th className="px-4 py-3 font-semibold hidden lg:table-cell">OT</th>}
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr><td colSpan={isCompliant ? 9 : 10} className="p-10 text-center text-text-muted">Loading…</td></tr>
              )}
              {!isLoading && !data?.rows.length && (
                <tr><td colSpan={isCompliant ? 9 : 10} className="p-10 text-center text-text-muted">No records for this date range.</td></tr>
              )}
              {data?.rows.slice(0, 500).map((r, i) => {
                const emp = r.employeeId;
                const entry = isCompliant ? r.compliantEntryAt : r.realEntryAt;
                const exit = isCompliant ? r.compliantExitAt : r.realExitAt;
                const hrs = isCompliant ? r.compliantHours : r.realNetHours;
                return (
                  <tr key={i} className="hover:bg-surface2/50">
                    <td className="px-4 py-2.5 font-mono text-xs">{fmtDate(r.date)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{emp?.empCode ?? '—'}</td>
                    <td className="px-4 py-2.5 font-medium">{emp?.name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs hidden lg:table-cell">{emp?.department ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-text-muted hidden xl:table-cell">{emp?.location ?? '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{entry ? fmtTime(entry) : '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{exit ? fmtTime(exit) : '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{typeof hrs === 'number' ? fmtHours(hrs) : '—'}</td>
                    {!isCompliant && <td className="px-4 py-2.5 font-mono text-xs hidden lg:table-cell">{r.otHours ? fmtHours(r.otHours) : '—'}</td>}
                    <td className="px-4 py-2.5">
                      <Badge tone={r.status === 'Present' ? 'green' : r.status === 'Absent' ? 'red' : 'gray'}>{r.status}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {data && data.rows.length > 500 && (
          <div className="p-3 text-center text-xs text-text-muted bg-surface2">
            Showing first 500 rows. Download CSV for full export.
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

function MonthlyReport() {
  const { logReportsAction } = useActivityLog();
  const toast = useToast((s) => s.push);
  const now = new Date();
  const defaultYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [yearMonth, setYearMonth] = useState(defaultYearMonth);
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get, staleTime: 60_000 });
  const branding = brandingFromSettings(settings);

  const logMonthlyFilter = (patch: Partial<{ yearMonth: string; department: string; location: string }>) => {
    logReportsAction('ui.reports.filter', {
      tab: 'monthly',
      yearMonth: patch.yearMonth ?? yearMonth,
      department: (patch.department ?? department) || undefined,
      location: (patch.location ?? location) || undefined,
    });
  };

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'monthly', yearMonth, department, location],
    queryFn: () => reportsApi.monthly({ yearMonth, department: department || undefined, location: location || undefined }),
  });

  const isCompliant = data?.viewMode === 'compliant';
  const monthlyFilterDefaults = { yearMonth: defaultYearMonth, department: '', location: '' };

  return (
    <div>
      <FilterBar
        activeCount={countActiveFilters({ yearMonth, department, location }, monthlyFilterDefaults)}
        onClear={() => {
          setYearMonth(defaultYearMonth);
          setDepartment('');
          setLocation('');
        }}
      >
        <Field label="Month"><Input type="month" value={yearMonth} onChange={(e) => { setYearMonth(e.target.value); logMonthlyFilter({ yearMonth: e.target.value }); }} /></Field>
        <Field label="Department">
          <Select value={department} onChange={(e) => { setDepartment(e.target.value); logMonthlyFilter({ department: e.target.value }); }}>
            <option value="">All</option>
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </Select>
        </Field>
        <Field label="Location">
          <Select value={location} onChange={(e) => { setLocation(e.target.value); logMonthlyFilter({ location: e.target.value }); }}>
            <option value="">All</option>
            {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
          </Select>
        </Field>
      </FilterBar>

      <ReportExportBar
        recordCount={data?.rows.length}
        isLoading={isLoading}
        onPrint={() => {
          if (!data?.rows.length) {
            toast('No records to print', 'error');
            return;
          }
          logReportsAction('ui.reports.print', { tab: 'monthly', yearMonth, department: department || undefined, location: location || undefined });
          const opened = openReportPrintWindow({
            branding,
            title: 'Monthly Summary Report',
            subtitle: `Period: ${yearMonth}`,
            summaryLine: `${data.rows.length} employees`,
            columns: [
              { key: 'code', label: 'Code', mono: true },
              { key: 'name', label: 'Name' },
              { key: 'department', label: 'Department' },
              { key: 'present', label: 'Present', mono: true },
              { key: 'absent', label: 'Absent', mono: true },
              { key: 'weeklyOff', label: 'Weekly Off', mono: true },
              { key: 'totalHrs', label: 'Total Hrs', mono: true },
              ...(isCompliant ? [] : [{ key: 'ot', label: 'OT Hrs', mono: true }]),
              { key: 'equivDays', label: 'Equiv. Days', mono: true },
            ],
            rows: data.rows.map((r) => ({
              code: r.empCode,
              name: r.name,
              department: r.department,
              present: r.presentDays,
              absent: r.absentDays,
              weeklyOff: r.weeklyOffDays,
              totalHrs: fmtHours(isCompliant ? r.totalCompliantHours : r.totalRealNetHours),
              ot: fmtHours(r.totalOtHours),
              equivDays: r.equivalentDays?.toFixed(1) ?? '—',
            })),
          });
          if (!opened) toast('Could not start print. Please try again.', 'error');
        }}
        onDownloadCsv={() => {
          logReportsAction('ui.reports.export_csv', { tab: 'monthly', yearMonth, department: department || undefined, location: location || undefined });
          const a = document.createElement('a');
          a.href = reportsApi.monthlyCsvUrl({ yearMonth, department: department || undefined, location: location || undefined });
          a.click();
          toast('CSV download started', 'success');
        }}
      />

      <MonthlyReportCardList
        rows={data?.rows}
        isLoading={isLoading}
        isCompliant={isCompliant ?? false}
      />

      <div className="card overflow-hidden hidden md:block">
        <div className="tbl-scroll">
          <table className="w-full text-sm md:min-w-[560px] xl:min-w-0">
            <thead className="bg-surface2">
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold hidden lg:table-cell">Dept</th>
                <th className="px-4 py-3 font-semibold">Present</th>
                <th className="px-4 py-3 font-semibold">Absent</th>
                <th className="px-4 py-3 font-semibold hidden lg:table-cell">Weekly Off</th>
                <th className="px-4 py-3 font-semibold">Total Hrs</th>
                {!isCompliant && <th className="px-4 py-3 font-semibold hidden xl:table-cell">OT</th>}
                <th className="px-4 py-3 font-semibold hidden xl:table-cell">Equiv. Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={isCompliant ? 8 : 9} className="p-10 text-center text-text-muted">Loading…</td></tr>}
              {!isLoading && !data?.rows.length && (
                <tr><td colSpan={isCompliant ? 8 : 9} className="p-10 text-center text-text-muted">No records for this month.</td></tr>
              )}
              {data?.rows.map((r) => (
                <tr key={r.employeeId} className="hover:bg-surface2/50">
                  <td className="px-4 py-2.5 font-mono text-xs">{r.empCode}</td>
                  <td className="px-4 py-2.5 font-medium">{r.name}</td>
                  <td className="px-4 py-2.5 text-xs hidden lg:table-cell">{r.department}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{r.presentDays}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{r.absentDays}</td>
                  <td className="px-4 py-2.5 font-mono text-xs hidden lg:table-cell">{r.weeklyOffDays}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{fmtHours(isCompliant ? r.totalCompliantHours : r.totalRealNetHours)}</td>
                  {!isCompliant && <td className="px-4 py-2.5 font-mono text-xs hidden xl:table-cell">{fmtHours(r.totalOtHours)}</td>}
                  <td className="px-4 py-2.5 font-mono text-xs hidden xl:table-cell">{r.equivalentDays?.toFixed(1) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DepartmentReport() {
  const { logReportsAction } = useActivityLog();
  const toast = useToast((s) => s.push);
  const isCompliant = useAuth((s) => s.user?.viewMode === 'compliant');
  const now = new Date();
  const defaultYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [yearMonth, setYearMonth] = useState(defaultYearMonth);
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get, staleTime: 60_000 });
  const branding = brandingFromSettings(settings);

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'department', yearMonth],
    queryFn: () => reportsApi.department({ yearMonth }),
  });

  const deptFilterDefaults = { yearMonth: defaultYearMonth };

  return (
    <div>
      <FilterBar
        activeCount={countActiveFilters({ yearMonth }, deptFilterDefaults)}
        onClear={() => setYearMonth(defaultYearMonth)}
      >
        <Field label="Month"><Input type="month" value={yearMonth} onChange={(e) => { setYearMonth(e.target.value); logReportsAction('ui.reports.filter', { tab: 'department', yearMonth: e.target.value }); }} /></Field>
      </FilterBar>

      <ReportExportBar
        recordCount={data?.rows.length}
        isLoading={isLoading}
        onPrint={() => {
          if (!data?.rows.length) {
            toast('No records to print', 'error');
            return;
          }
          logReportsAction('ui.reports.print', { tab: 'department', yearMonth });
          const opened = openReportPrintWindow({
            branding,
            title: 'Department-wise Report',
            subtitle: `Period: ${yearMonth}`,
            summaryLine: `${data.rows.length} departments`,
            columns: [
              { key: 'department', label: 'Department' },
              { key: 'employees', label: 'Employees', mono: true },
              { key: 'present', label: 'Present', mono: true },
              { key: 'absent', label: 'Absent', mono: true },
              { key: 'compliantHrs', label: isCompliant ? 'Compliant Hrs' : 'Net Hrs', mono: true },
              ...(isCompliant ? [] : [{ key: 'ot', label: 'OT Hrs', mono: true }]),
              { key: 'rate', label: 'Attendance Rate', mono: true },
            ],
            rows: data.rows.map((r) => ({
              department: r.department,
              employees: r.employeeCount,
              present: r.presentDays,
              absent: r.absentDays,
              compliantHrs: fmtHours(r.totalCompliantHours),
              ot: fmtHours(r.totalOtHours),
              rate: `${r.attendanceRate.toFixed(0)}%`,
            })),
          });
          if (!opened) toast('Could not start print. Please try again.', 'error');
        }}
        onDownloadCsv={() => {
          logReportsAction('ui.reports.export_csv', { tab: 'department', yearMonth });
          const a = document.createElement('a');
          a.href = reportsApi.departmentCsvUrl({ yearMonth });
          a.click();
          toast('CSV download started', 'success');
        }}
      />

      <DepartmentReportCardList rows={data?.rows} isLoading={isLoading} />

      <div className="card overflow-hidden hidden md:block">
        <div className="tbl-scroll">
        <table className="w-full text-sm md:min-w-[640px]">
          <thead className="bg-surface2">
            <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
              <th className="px-4 py-3 font-semibold">Department</th>
              <th className="px-4 py-3 font-semibold">Employees</th>
              <th className="px-4 py-3 font-semibold">Present</th>
              <th className="px-4 py-3 font-semibold">Absent</th>
              <th className="px-4 py-3 font-semibold">{isCompliant ? 'Compliant Hrs' : 'Net Hrs'}</th>
              {!isCompliant && <th className="px-4 py-3 font-semibold">OT Hrs</th>}
              <th className="px-4 py-3 font-semibold">Attendance Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td colSpan={isCompliant ? 6 : 7} className="p-10 text-center text-text-muted">Loading…</td></tr>}
            {!isLoading && !data?.rows.length && (
              <tr><td colSpan={isCompliant ? 6 : 7} className="p-10 text-center text-text-muted">No department data for this month.</td></tr>
            )}
            {data?.rows.map((r) => (
              <tr key={r.department} className="hover:bg-surface2/50">
                <td className="px-4 py-2.5 font-medium">{r.department}</td>
                <td className="px-4 py-2.5">{r.employeeCount}</td>
                <td className="px-4 py-2.5">{r.presentDays}</td>
                <td className="px-4 py-2.5">{r.absentDays}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{fmtHours(r.totalCompliantHours)}</td>
                {!isCompliant && <td className="px-4 py-2.5 font-mono text-xs">{fmtHours(r.totalOtHours)}</td>}
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-surface2 rounded-full overflow-hidden">
                      <div className="h-full bg-green" style={{ width: `${Math.min(100, r.attendanceRate)}%` }} />
                    </div>
                    <span className="font-mono text-xs">{r.attendanceRate.toFixed(0)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

function LocationReport() {
  const { logReportsAction } = useActivityLog();
  const toast = useToast((s) => s.push);
  const isCompliant = useAuth((s) => s.user?.viewMode === 'compliant');
  const now = new Date();
  const defaultYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [yearMonth, setYearMonth] = useState(defaultYearMonth);
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get, staleTime: 60_000 });
  const branding = brandingFromSettings(settings);

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'location', yearMonth],
    queryFn: () => reportsApi.location({ yearMonth }),
  });

  const locFilterDefaults = { yearMonth: defaultYearMonth };

  return (
    <div>
      <FilterBar
        activeCount={countActiveFilters({ yearMonth }, locFilterDefaults)}
        onClear={() => setYearMonth(defaultYearMonth)}
      >
        <Field label="Month"><Input type="month" value={yearMonth} onChange={(e) => { setYearMonth(e.target.value); logReportsAction('ui.reports.filter', { tab: 'location', yearMonth: e.target.value }); }} /></Field>
      </FilterBar>

      <ReportExportBar
        recordCount={data?.rows.length}
        isLoading={isLoading}
        onPrint={() => {
          if (!data?.rows.length) {
            toast('No records to print', 'error');
            return;
          }
          logReportsAction('ui.reports.print', { tab: 'location', yearMonth });
          const opened = openReportPrintWindow({
            branding,
            title: 'Location-wise Report',
            subtitle: `Period: ${yearMonth}`,
            summaryLine: `${data.rows.length} locations`,
            columns: [
              { key: 'location', label: 'Location' },
              { key: 'employees', label: 'Employees', mono: true },
              { key: 'present', label: 'Present', mono: true },
              { key: 'absent', label: 'Absent', mono: true },
              { key: 'compliantHrs', label: isCompliant ? 'Compliant Hrs' : 'Net Hrs', mono: true },
              ...(isCompliant ? [] : [{ key: 'ot', label: 'OT Hrs', mono: true }]),
              { key: 'rate', label: 'Attendance Rate', mono: true },
            ],
            rows: data.rows.map((r) => ({
              location: r.location,
              employees: r.employeeCount,
              present: fmtNumber(r.presentDays),
              absent: fmtNumber(r.absentDays),
              compliantHrs: fmtHours(r.totalCompliantHours),
              ot: fmtHours(r.totalOtHours),
              rate: `${r.attendanceRate.toFixed(0)}%`,
            })),
          });
          if (!opened) toast('Could not start print. Please try again.', 'error');
        }}
        onDownloadCsv={() => {
          logReportsAction('ui.reports.export_csv', { tab: 'location', yearMonth });
          const a = document.createElement('a');
          a.href = reportsApi.locationCsvUrl({ yearMonth });
          a.click();
          toast('CSV download started', 'success');
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:hidden">
        {isLoading && <div className="text-text-muted">Loading...</div>}
        {data?.rows.map((r) => (
          <div key={r.location} className="card p-5">
            <div className="font-bold mb-1">{r.location}</div>
            <div className="text-xs text-text-muted mb-3">{r.employeeCount} employees</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-green-bg p-2 rounded">
                <div className="text-[10px] uppercase tracking-wider">Present</div>
                <div className="font-bold">{fmtNumber(r.presentDays)}</div>
              </div>
              <div className="bg-red-bg p-2 rounded">
                <div className="text-[10px] uppercase tracking-wider">Absent</div>
                <div className="font-bold">{fmtNumber(r.absentDays)}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-2 bg-surface2 rounded-full overflow-hidden">
                <div className="h-full bg-green" style={{ width: `${Math.min(100, r.attendanceRate)}%` }} />
              </div>
              <span className="font-mono text-xs">{r.attendanceRate.toFixed(0)}% rate</span>
            </div>
            <div className="mt-3 text-xs text-text-muted">
              {fmtHours(r.totalCompliantHours)} compliant{!isCompliant && ` · ${fmtHours(r.totalOtHours)} OT`}
            </div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden hidden md:block">
        <div className="tbl-scroll">
          <table className="w-full text-sm md:min-w-[640px]">
            <thead className="bg-surface2">
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Employees</th>
                <th className="px-4 py-3 font-semibold">Present</th>
                <th className="px-4 py-3 font-semibold">Absent</th>
                <th className="px-4 py-3 font-semibold">{isCompliant ? 'Compliant Hrs' : 'Net Hrs'}</th>
                {!isCompliant && <th className="px-4 py-3 font-semibold">OT Hrs</th>}
                <th className="px-4 py-3 font-semibold">Attendance Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={isCompliant ? 6 : 7} className="p-10 text-center text-text-muted">Loading…</td></tr>}
              {!isLoading && !data?.rows.length && (
                <tr><td colSpan={isCompliant ? 6 : 7} className="p-10 text-center text-text-muted">No location data for this month.</td></tr>
              )}
              {data?.rows.map((r) => (
                <tr key={r.location} className="hover:bg-surface2/50">
                  <td className="px-4 py-2.5 font-medium">{r.location}</td>
                  <td className="px-4 py-2.5">{r.employeeCount}</td>
                  <td className="px-4 py-2.5">{fmtNumber(r.presentDays)}</td>
                  <td className="px-4 py-2.5">{fmtNumber(r.absentDays)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{fmtHours(r.totalCompliantHours)}</td>
                  {!isCompliant && <td className="px-4 py-2.5 font-mono text-xs">{fmtHours(r.totalOtHours)}</td>}
                  <td className="px-4 py-2.5 font-mono text-xs">{r.attendanceRate.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReportExportBar({
  recordCount,
  isLoading,
  onPrint,
  onDownloadCsv,
}: {
  recordCount?: number;
  isLoading: boolean;
  onPrint: () => void;
  onDownloadCsv: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
      <div className="text-sm text-text-muted">
        {isLoading ? 'Loading...' : `${recordCount ?? 0} records`}
      </div>
      <div className="flex gap-2 w-full sm:w-auto no-print">
        <button type="button" className="btn-outline flex-1 sm:flex-none" onClick={onPrint}>
          Print to PDF
        </button>
        <button type="button" className="btn-primary flex-1 sm:flex-none" onClick={onDownloadCsv}>
          Download CSV
        </button>
      </div>
    </div>
  );
}

function FilterBar({
  children,
  activeCount = 0,
  onClear,
}: {
  children: React.ReactNode;
  activeCount?: number;
  onClear?: () => void;
}) {
  return (
    <MobileFilterBar
      activeCount={activeCount}
      onClear={onClear}
      className="no-print"
      desktopClassName="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"
    >
      {children}
    </MobileFilterBar>
  );
}
