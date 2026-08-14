import { useState, useCallback } from 'react';
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
import { EMPTY_CELL, fmtDate, fmtHours, fmtNumber } from '../lib/format';
import { useTimeDisplay } from '../store/timeFormat';
import { MobileFilterBar } from '../components/ui/MobileFilterBar';
import { countActiveFilters } from '../lib/countActiveFilters';
import { usePageTourController } from '../hooks/usePageTourController';
import { GiveMeATourButton } from '../components/onboarding/GiveMeATourButton';
import { reportsTourScript } from '../lib/onboarding/scripts/reportsTourScript';
import { SortableTh } from '../components/ui/SortableTh';
import { TablePagination } from '../components/ui/TablePagination';
import { useTableSort } from '../lib/tableSort';
import { tableColumnTooltip } from '../lib/tooltips/tableColumnTooltips';

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
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3" data-tour-id="reports-header">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Reports</h1>
          <p className="text-sm text-text-muted mt-0.5">Attendance records and summaries</p>
        </div>
        <GiveMeATourButton onClick={tour.onReplayTour} />
      </div>

      <div className="card mb-6 overflow-hidden" data-tour-id="reports-tabs">
        <div className="grid grid-cols-2 md:flex md:flex-wrap border-b border-border" data-tour-id="reports-monthly-hint">
          {[
            ['daily', 'Daily', 'Daily Attendance'],
            ['monthly', 'Monthly', 'Monthly Summary'],
            ['department', 'Dept', 'Department-wise'],
            ['location', 'Location', 'Location-wise'],
          ].map(([key, shortLabel, label]) => (
            <button
              key={key}
              onClick={() => {
                const next = key as Tab;
                setTab(next);
                logReportsAction('ui.reports.filter', { tab: next });
              }}
              className={`flex-1 md:flex-none px-3 md:px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors min-h-[44px] ${
                tab === key
                  ? 'tab-link--active'
                  : 'border-transparent text-text-muted hover:text-text hover:bg-surface2'
              }`}
            >
              <span className="md:hidden">{shortLabel}</span>
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
        </div>
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
  const [page, setPage] = useState(1);
  const [printing, setPrinting] = useState(false);
  const toast = useToast((s) => s.push);
  const PAGE_SIZE = 100;

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
    queryKey: ['reports', 'daily', startDate, endDate, department, location, page],
    queryFn: () =>
      reportsApi.daily({
        startDate,
        endDate,
        department: department || undefined,
        location: location || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  type DailyRow = NonNullable<typeof data>['rows'][number];
  const getDailySortValue = useCallback(
    (row: DailyRow, col: string) => {
      const emp = row.employeeId;
      if (col === 'date') return row.date;
      if (col === 'code') return emp?.empCode;
      if (col === 'name') return emp?.name;
      if (col === 'department') return emp?.department;
      if (col === 'location') return emp?.location;
      if (col === 'hours') return isCompliant ? row.compliantHours : row.realNetHours;
      if (col === 'ot') return row.otHours;
      if (col === 'status') return row.status;
      return '';
    },
    [isCompliant]
  );
  const { sortCol, toggleSort, sortArrow, sortedRows: displayDailyRows } = useTableSort(
    data?.rows ?? [],
    getDailySortValue,
    { date: 'date', hours: 'number', ot: 'number' }
  );
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const branding = brandingFromSettings(settings);

  const onPrint = async () => {
    if (!data || data.summary.total === 0) {
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
    setPrinting(true);
    try {
      // Print should include the full matching set, not just the current on-screen
      // page - fetch a single large batch (up to 5000) specifically for this.
      const printData = await reportsApi.daily({
        startDate,
        endDate,
        department: department || undefined,
        location: location || undefined,
        page: 1,
        pageSize: 5000,
      });
      const opened = openReportPrintWindow({
        branding,
        title: 'Daily Attendance Report',
        subtitle: formatReportDateRange(startDate, endDate),
        summaryLine: `${printData.summary.total} records · ${printData.summary.present} present · ${printData.summary.absent} absent · ${printData.summary.weeklyOff} weekly off`,
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
        rows: printData.rows.map((r) => {
          const emp = r.employeeId;
          const entry = isCompliant ? r.compliantEntryAt : r.realEntryAt;
          const exit = isCompliant ? r.compliantExitAt : r.realExitAt;
          const hrs = isCompliant ? r.compliantHours : r.realNetHours;
          const row: Record<string, string | number> = {
            date: fmtDate(r.date),
            code: emp?.empCode ?? EMPTY_CELL,
            name: emp?.name ?? EMPTY_CELL,
            department: emp?.department ?? EMPTY_CELL,
            location: emp?.location ?? EMPTY_CELL,
            entry: entry ? fmtTime(entry) : EMPTY_CELL,
            exit: exit ? fmtTime(exit) : EMPTY_CELL,
            hours: typeof hrs === 'number' ? fmtHours(hrs) : EMPTY_CELL,
            status: r.status ?? EMPTY_CELL,
          };
          if (!isCompliant) row.ot = r.otHours ? fmtHours(r.otHours) : EMPTY_CELL;
          return row;
        }),
      });
      if (!opened) {
        toast('Could not start print. Please try again.', 'error');
      } else if (printData.total > printData.rows.length) {
        toast(`Print includes first ${printData.rows.length.toLocaleString()} records (limit reached)`, 'success');
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not prepare print', 'error');
    } finally {
      setPrinting(false);
    }
  };

  const onDownloadExcel = async () => {
    logReportsAction('ui.reports.export_xlsx', {
      tab: 'daily',
      startDate,
      endDate,
      department: department || undefined,
      location: location || undefined,
    });
    try {
      await reportsApi.downloadDailyXlsx({ startDate, endDate, department: department || undefined, location: location || undefined });
      toast('Excel download started', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Export failed', 'error');
    }
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
          setPage(1);
        }}
      >
        <Field label="From"><Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); logDailyFilter({ startDate: e.target.value }); }} /></Field>
        <Field label="To"><Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); logDailyFilter({ endDate: e.target.value }); }} /></Field>
        <Field label="Department">
          <Select value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); logDailyFilter({ department: e.target.value }); }}>
            <option value="">All</option>
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </Select>
        </Field>
        <Field label="Location">
          <Select value={location} onChange={(e) => { setLocation(e.target.value); setPage(1); logDailyFilter({ location: e.target.value }); }}>
            <option value="">All</option>
            {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
          </Select>
        </Field>
      </FilterBar>
      </div>

      <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4" data-tour-id="reports-results">
        <div className="text-sm text-text-muted flex flex-wrap items-center gap-x-3 gap-y-1 flex-1">
          <span className="font-medium text-text">{isLoading ? 'Loading...' : `${data?.summary.total ?? 0} records`}</span>
          {data && (
            <>
              <span className="hidden sm:block w-px h-4 bg-border" />
              <Badge tone="green">{data.summary.present} present</Badge>
              <Badge tone="red">{data.summary.absent} absent</Badge>
              <Badge tone="gray">{data.summary.weeklyOff} weekly off</Badge>
            </>
          )}
        </div>
        <div className="flex gap-2 w-full sm:w-auto no-print shrink-0" data-tour-id="reports-export">
          <button type="button" className="btn-primary flex-1 sm:flex-none" onClick={() => void onPrint()} disabled={printing}>
            {printing ? 'Preparing…' : 'Print to PDF'}
          </button>
          <button type="button" className="btn-outline flex-1 sm:flex-none" onClick={onDownloadExcel}>Download Excel</button>
        </div>
      </div>

      <DailyReportCardList rows={displayDailyRows} isLoading={isLoading} isCompliant={isCompliant} />

      <div className="card overflow-hidden hidden md:block">
        <div className="tbl-scroll">
          <table className="w-full text-sm md:min-w-[640px] xl:min-w-0">
            <thead className="bg-surface2">
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                <SortableTh label="Date" sortKey="date" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} tooltip={tableColumnTooltip('reports', 'date')} />
                <SortableTh label="Code" sortKey="code" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} tooltip={tableColumnTooltip('reports', 'code')} />
                <SortableTh label="Name" sortKey="name" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} tooltip={tableColumnTooltip('reports', 'name')} />
                <SortableTh label="Dept" sortKey="department" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} className="hidden lg:table-cell" tooltip={tableColumnTooltip('reports', 'department')} />
                <SortableTh label="Location" sortKey="location" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} className="hidden xl:table-cell" tooltip={tableColumnTooltip('reports', 'location')} />
                <th className="px-4 py-3 font-semibold">Entry</th>
                <th className="px-4 py-3 font-semibold">Exit</th>
                <SortableTh label={isCompliant ? 'Hours' : 'Net Hrs'} sortKey="hours" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} tooltip={tableColumnTooltip('reports', 'hours')} />
                {!isCompliant && <SortableTh label="OT" sortKey="ot" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} className="hidden lg:table-cell" tooltip={tableColumnTooltip('reports', 'ot')} />}
                <SortableTh label="Status" sortKey="status" activeCol={sortCol} sortArrow={sortArrow} onSort={toggleSort} tooltip={tableColumnTooltip('reports', 'status')} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr><td colSpan={isCompliant ? 9 : 10} className="p-10 text-center text-text-muted">Loading…</td></tr>
              )}
              {!isLoading && !data?.rows.length && (
                <tr><td colSpan={isCompliant ? 9 : 10} className="py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-text-muted">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-30"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <span className="text-sm font-medium">No records found</span>
                    <span className="text-xs">Try widening the date range or adjusting the filters</span>
                  </div>
                </td></tr>
              )}
              {displayDailyRows.map((r, i) => {
                const emp = r.employeeId;
                const entry = isCompliant ? r.compliantEntryAt : r.realEntryAt;
                const exit = isCompliant ? r.compliantExitAt : r.realExitAt;
                const hrs = isCompliant ? r.compliantHours : r.realNetHours;
                return (
                  <tr key={i} className="hover:bg-surface2/50">
                    <td className="px-4 py-2.5 font-mono text-xs">{fmtDate(r.date)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{emp?.empCode ?? EMPTY_CELL}</td>
                    <td className="px-4 py-2.5 font-medium">{emp?.name ?? EMPTY_CELL}</td>
                    <td className="px-4 py-2.5 text-xs hidden lg:table-cell">{emp?.department ?? EMPTY_CELL}</td>
                    <td className="px-4 py-2.5 text-xs text-text-muted hidden xl:table-cell">{emp?.location ?? EMPTY_CELL}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{entry ? fmtTime(entry) : EMPTY_CELL}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{exit ? fmtTime(exit) : EMPTY_CELL}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{typeof hrs === 'number' ? fmtHours(hrs) : EMPTY_CELL}</td>
                    {!isCompliant && <td className="px-4 py-2.5 font-mono text-xs hidden lg:table-cell">{r.otHours ? fmtHours(r.otHours) : EMPTY_CELL}</td>}
                    <td className="px-4 py-2.5">
                      <Badge tone={r.status === 'Present' ? 'green' : r.status === 'Absent' ? 'red' : 'gray'}>{r.status}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <TablePagination
        page={page}
        totalPages={totalPages}
        total={data?.total}
        showTotal
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
      />
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
  type MonthlyRow = NonNullable<typeof data>['rows'][number];
  const getMonthlySortValue = useCallback((row: MonthlyRow, col: string) => {
    if (col === 'code') return row.empCode;
    if (col === 'name') return row.name;
    if (col === 'department') return row.department;
    if (col === 'present') return row.presentDays;
    if (col === 'absent') return row.absentDays;
    if (col === 'weeklyOff') return row.weeklyOffDays;
    if (col === 'totalHrs') return isCompliant ? row.totalCompliantHours : row.totalRealNetHours;
    if (col === 'ot') return row.totalOtHours;
    if (col === 'equivDays') return row.equivalentDays;
    return '';
  }, [isCompliant]);
  const { sortCol: monthlySortCol, toggleSort: toggleMonthlySort, sortArrow: monthlySortArrow, sortedRows: sortedMonthlyRows } =
    useTableSort(data?.rows ?? [], getMonthlySortValue, {
      present: 'number',
      absent: 'number',
      weeklyOff: 'number',
      totalHrs: 'number',
      ot: 'number',
      equivDays: 'number',
    });
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
              { key: 'ot', label: 'OT Hrs', mono: true },
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
              equivDays: r.equivalentDays?.toFixed(1) ?? EMPTY_CELL,
            })),
          });
          if (!opened) toast('Could not start print. Please try again.', 'error');
        }}
        onDownloadExcel={async () => {
          logReportsAction('ui.reports.export_xlsx', { tab: 'monthly', yearMonth, department: department || undefined, location: location || undefined });
          try {
            await reportsApi.downloadMonthlyXlsx({ yearMonth, department: department || undefined, location: location || undefined });
            toast('Excel download started', 'success');
          } catch (e) {
            toast(e instanceof Error ? e.message : 'Export failed', 'error');
          }
        }}
      />

      <MonthlyReportCardList
        rows={sortedMonthlyRows}
        isLoading={isLoading}
        isCompliant={isCompliant ?? false}
      />

      <div className="card overflow-hidden hidden md:block">
        <div className="tbl-scroll">
          <table className="w-full text-sm md:min-w-[560px] xl:min-w-0">
            <thead className="bg-surface2">
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                <SortableTh label="Code" sortKey="code" activeCol={monthlySortCol} sortArrow={monthlySortArrow} onSort={toggleMonthlySort} tooltip={tableColumnTooltip('reports', 'code')} />
                <SortableTh label="Name" sortKey="name" activeCol={monthlySortCol} sortArrow={monthlySortArrow} onSort={toggleMonthlySort} tooltip={tableColumnTooltip('reports', 'name')} />
                <SortableTh label="Dept" sortKey="department" activeCol={monthlySortCol} sortArrow={monthlySortArrow} onSort={toggleMonthlySort} className="hidden lg:table-cell" tooltip={tableColumnTooltip('reports', 'department')} />
                <SortableTh label="Present" sortKey="present" activeCol={monthlySortCol} sortArrow={monthlySortArrow} onSort={toggleMonthlySort} tooltip={tableColumnTooltip('reports', 'present')} />
                <SortableTh label="Absent" sortKey="absent" activeCol={monthlySortCol} sortArrow={monthlySortArrow} onSort={toggleMonthlySort} tooltip={tableColumnTooltip('reports', 'absent')} />
                <SortableTh label="Weekly Off" sortKey="weeklyOff" activeCol={monthlySortCol} sortArrow={monthlySortArrow} onSort={toggleMonthlySort} className="hidden lg:table-cell" tooltip={tableColumnTooltip('reports', 'weeklyOff')} />
                <SortableTh label="Total Hrs" sortKey="totalHrs" activeCol={monthlySortCol} sortArrow={monthlySortArrow} onSort={toggleMonthlySort} tooltip={tableColumnTooltip('reports', 'totalHrs')} />
                <SortableTh label="OT" sortKey="ot" activeCol={monthlySortCol} sortArrow={monthlySortArrow} onSort={toggleMonthlySort} className="hidden xl:table-cell" tooltip={tableColumnTooltip('reports', 'ot')} />
                <SortableTh label="Equiv. Days" sortKey="equivDays" activeCol={monthlySortCol} sortArrow={monthlySortArrow} onSort={toggleMonthlySort} className="hidden xl:table-cell" tooltip={tableColumnTooltip('reports', 'equivDays')} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={9} className="p-10 text-center text-text-muted">Loading…</td></tr>}
              {!isLoading && !data?.rows.length && (
                <tr><td colSpan={9} className="py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-text-muted">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-30"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <span className="text-sm font-medium">No records found</span>
                    <span className="text-xs">Try selecting a different month or adjusting the filters</span>
                  </div>
                </td></tr>
              )}
              {sortedMonthlyRows.map((r) => (
                <tr key={r.employeeId} className="hover:bg-surface2/50">
                  <td className="px-4 py-2.5 font-mono text-xs">{r.empCode}</td>
                  <td className="px-4 py-2.5 font-medium">{r.name}</td>
                  <td className="px-4 py-2.5 text-xs hidden lg:table-cell">{r.department}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{r.presentDays}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{r.absentDays}</td>
                  <td className="px-4 py-2.5 font-mono text-xs hidden lg:table-cell">{r.weeklyOffDays}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{fmtHours(isCompliant ? r.totalCompliantHours : r.totalRealNetHours)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs hidden xl:table-cell">{fmtHours(r.totalOtHours)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs hidden xl:table-cell">{r.equivalentDays?.toFixed(1) ?? EMPTY_CELL}</td>
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
  const now = new Date();
  const defaultYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [yearMonth, setYearMonth] = useState(defaultYearMonth);
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get, staleTime: 60_000 });
  const branding = brandingFromSettings(settings);

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'department', yearMonth],
    queryFn: () => reportsApi.department({ yearMonth }),
  });

  type DeptRow = NonNullable<typeof data>['rows'][number];
  const getDeptSortValue = useCallback((row: DeptRow, col: string) => {
    if (col === 'department') return row.department;
    if (col === 'employees') return row.employeeCount;
    if (col === 'present') return row.presentDays;
    if (col === 'absent') return row.absentDays;
    if (col === 'compliantHrs') return row.totalCompliantHours;
    if (col === 'ot') return row.totalOtHours;
    if (col === 'rate') return row.attendanceRate;
    return '';
  }, []);
  const { sortCol: deptSortCol, toggleSort: toggleDeptSort, sortArrow: deptSortArrow, sortedRows: sortedDeptRows } =
    useTableSort(data?.rows ?? [], getDeptSortValue, {
      employees: 'number',
      present: 'number',
      absent: 'number',
      compliantHrs: 'number',
      ot: 'number',
      rate: 'number',
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
              { key: 'compliantHrs', label: 'Compliant Hrs', mono: true },
              { key: 'ot', label: 'OT Hrs', mono: true },
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
        onDownloadExcel={async () => {
          logReportsAction('ui.reports.export_xlsx', { tab: 'department', yearMonth });
          try {
            await reportsApi.downloadDepartmentXlsx({ yearMonth });
            toast('Excel download started', 'success');
          } catch (e) {
            toast(e instanceof Error ? e.message : 'Export failed', 'error');
          }
        }}
      />

      <DepartmentReportCardList rows={sortedDeptRows} isLoading={isLoading} />

      <div className="card overflow-hidden hidden md:block">
        <div className="tbl-scroll">
        <table className="w-full text-sm md:min-w-[640px]">
          <thead className="bg-surface2">
            <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
              <SortableTh label="Department" sortKey="department" activeCol={deptSortCol} sortArrow={deptSortArrow} onSort={toggleDeptSort} tooltip={tableColumnTooltip('reports', 'department')} />
              <SortableTh label="Employees" sortKey="employees" activeCol={deptSortCol} sortArrow={deptSortArrow} onSort={toggleDeptSort} tooltip={tableColumnTooltip('reports', 'employees')} />
              <SortableTh label="Present" sortKey="present" activeCol={deptSortCol} sortArrow={deptSortArrow} onSort={toggleDeptSort} tooltip={tableColumnTooltip('reports', 'present')} />
              <SortableTh label="Absent" sortKey="absent" activeCol={deptSortCol} sortArrow={deptSortArrow} onSort={toggleDeptSort} tooltip={tableColumnTooltip('reports', 'absent')} />
              <SortableTh label="Compliant Hrs" sortKey="compliantHrs" activeCol={deptSortCol} sortArrow={deptSortArrow} onSort={toggleDeptSort} tooltip={tableColumnTooltip('reports', 'hours')} />
              <SortableTh label="OT Hrs" sortKey="ot" activeCol={deptSortCol} sortArrow={deptSortArrow} onSort={toggleDeptSort} tooltip={tableColumnTooltip('reports', 'ot')} />
              <SortableTh label="Attendance Rate" sortKey="rate" activeCol={deptSortCol} sortArrow={deptSortArrow} onSort={toggleDeptSort} tooltip={tableColumnTooltip('reports', 'avgHrs')} />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td colSpan={7} className="p-10 text-center text-text-muted">Loading…</td></tr>}
            {!isLoading && !data?.rows.length && (
              <tr><td colSpan={7} className="py-14 text-center">
                <div className="flex flex-col items-center gap-2 text-text-muted">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-30"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <span className="text-sm font-medium">No department data</span>
                  <span className="text-xs">Try selecting a different month</span>
                </div>
              </td></tr>
            )}
            {sortedDeptRows.map((r) => (
              <tr key={r.department} className="hover:bg-surface2/50">
                <td className="px-4 py-2.5 font-medium">{r.department}</td>
                <td className="px-4 py-2.5">{r.employeeCount}</td>
                <td className="px-4 py-2.5">{r.presentDays}</td>
                <td className="px-4 py-2.5">{r.absentDays}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{fmtHours(r.totalCompliantHours)}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{fmtHours(r.totalOtHours)}</td>
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
  const now = new Date();
  const defaultYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [yearMonth, setYearMonth] = useState(defaultYearMonth);
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get, staleTime: 60_000 });
  const branding = brandingFromSettings(settings);

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'location', yearMonth],
    queryFn: () => reportsApi.location({ yearMonth }),
  });

  type LocRow = NonNullable<typeof data>['rows'][number];
  const getLocSortValue = useCallback((row: LocRow, col: string) => {
    if (col === 'location') return row.location;
    if (col === 'employees') return row.employeeCount;
    if (col === 'present') return row.presentDays;
    if (col === 'absent') return row.absentDays;
    if (col === 'compliantHrs') return row.totalCompliantHours;
    if (col === 'ot') return row.totalOtHours;
    if (col === 'rate') return row.attendanceRate;
    return '';
  }, []);
  const { sortCol: locSortCol, toggleSort: toggleLocSort, sortArrow: locSortArrow, sortedRows: sortedLocRows } =
    useTableSort(data?.rows ?? [], getLocSortValue, {
      employees: 'number',
      present: 'number',
      absent: 'number',
      compliantHrs: 'number',
      ot: 'number',
      rate: 'number',
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
              { key: 'compliantHrs', label: 'Compliant Hrs', mono: true },
              { key: 'ot', label: 'OT Hrs', mono: true },
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
        onDownloadExcel={async () => {
          logReportsAction('ui.reports.export_xlsx', { tab: 'location', yearMonth });
          try {
            await reportsApi.downloadLocationXlsx({ yearMonth });
            toast('Excel download started', 'success');
          } catch (e) {
            toast(e instanceof Error ? e.message : 'Export failed', 'error');
          }
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:hidden card-grid-stretch">
        {isLoading && <div className="text-text-muted">Loading...</div>}
        {sortedLocRows.map((r) => (
          <div key={r.location} className="card p-5 h-full flex flex-col">
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
              {fmtHours(r.totalCompliantHours)} compliant · {fmtHours(r.totalOtHours)} OT
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-10 overflow-hidden hidden md:block">
        <div className="tbl-scroll">
          <table className="w-full text-sm md:min-w-[640px]">
            <thead className="bg-surface2">
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                <SortableTh label="Location" sortKey="location" activeCol={locSortCol} sortArrow={locSortArrow} onSort={toggleLocSort} tooltip={tableColumnTooltip('reports', 'location')} />
                <SortableTh label="Employees" sortKey="employees" activeCol={locSortCol} sortArrow={locSortArrow} onSort={toggleLocSort} tooltip={tableColumnTooltip('reports', 'employees')} />
                <SortableTh label="Present" sortKey="present" activeCol={locSortCol} sortArrow={locSortArrow} onSort={toggleLocSort} tooltip={tableColumnTooltip('reports', 'present')} />
                <SortableTh label="Absent" sortKey="absent" activeCol={locSortCol} sortArrow={locSortArrow} onSort={toggleLocSort} tooltip={tableColumnTooltip('reports', 'absent')} />
                <SortableTh label="Compliant Hrs" sortKey="compliantHrs" activeCol={locSortCol} sortArrow={locSortArrow} onSort={toggleLocSort} tooltip={tableColumnTooltip('reports', 'hours')} />
                <SortableTh label="OT Hrs" sortKey="ot" activeCol={locSortCol} sortArrow={locSortArrow} onSort={toggleLocSort} tooltip={tableColumnTooltip('reports', 'ot')} />
                <SortableTh label="Attendance Rate" sortKey="rate" activeCol={locSortCol} sortArrow={locSortArrow} onSort={toggleLocSort} tooltip={tableColumnTooltip('reports', 'avgHrs')} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={7} className="p-10 text-center text-text-muted">Loading…</td></tr>}
              {!isLoading && !data?.rows.length && (
                <tr><td colSpan={7} className="py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-text-muted">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-30"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <span className="text-sm font-medium">No location data</span>
                    <span className="text-xs">Try selecting a different month</span>
                  </div>
                </td></tr>
              )}
              {sortedLocRows.map((r) => (
                <tr key={r.location} className="hover:bg-surface2/50">
                  <td className="px-4 py-2.5 font-medium">{r.location}</td>
                  <td className="px-4 py-2.5">{r.employeeCount}</td>
                  <td className="px-4 py-2.5">{fmtNumber(r.presentDays)}</td>
                  <td className="px-4 py-2.5">{fmtNumber(r.absentDays)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{fmtHours(r.totalCompliantHours)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{fmtHours(r.totalOtHours)}</td>
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
  onDownloadExcel,
}: {
  recordCount?: number;
  isLoading: boolean;
  onPrint: () => void;
  onDownloadExcel: () => void | Promise<void>;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
      <div className="text-sm flex-1">
        <span className="font-medium text-text">{isLoading ? 'Loading...' : `${recordCount ?? 0} records`}</span>
      </div>
      <div className="flex gap-2 w-full sm:w-auto no-print shrink-0">
        <button type="button" className="btn-primary flex-1 sm:flex-none" onClick={onPrint}>
          Print to PDF
        </button>
        <button type="button" className="btn-outline flex-1 sm:flex-none" onClick={() => void onDownloadExcel()}>
          Download Excel
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
      className="no-print mb-6"
      desktopClassName="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"
      noCard
    >
      {children}
    </MobileFilterBar>
  );
}
