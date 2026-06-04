import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../api/reports';
import { useAuth } from '../store/auth';
import { useToast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';
import { Field, Input, Select } from '../components/ui/Field';
import { fmtDate, fmtIstTime, fmtHours, fmtNumber } from '../lib/format';

type Tab = 'daily' | 'monthly' | 'department' | 'location';

const DEPARTMENTS = ['Confectionery', 'Tablet Manufacturing', 'Liquid Manufacturing', 'Packaging', 'Quality Control', 'R&D', 'Maintenance', 'Warehouse', 'Admin', 'HR', 'Finance', 'Logistics'];
const LOCATIONS = ['Surendranagar, GJ', 'Mandideep, MP', 'Gummadidala, TG', 'Morbi, GJ', 'Aurangabad, MH'];

export function Reports() {
  const [tab, setTab] = useState<Tab>('daily');
  const viewMode = useAuth((s) => s.user?.viewMode);
  const isCompliant = viewMode === 'compliant';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <div className="text-sm text-text-muted">
            View mode: <Badge tone={isCompliant ? 'amber' : 'blue'}>{isCompliant ? 'COMPLIANT (8-hour)' : 'REAL (12-hour)'}</Badge>
          </div>
        </div>
      </div>

      <div className="card mb-4 p-1.5 inline-flex gap-1 flex-wrap">
        {[
          ['daily', 'Daily Attendance'],
          ['monthly', 'Monthly Summary'],
          ['department', 'Department-wise'],
          ['location', 'Location-wise'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key as Tab)}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
              tab === key ? 'bg-primary text-white' : 'text-text-muted hover:bg-surface2'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'daily' && <DailyReport isCompliant={isCompliant} />}
      {tab === 'monthly' && <MonthlyReport />}
      {tab === 'department' && <DepartmentReport />}
      {tab === 'location' && <LocationReport />}
    </div>
  );
}

function DailyReport({ isCompliant }: { isCompliant: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(sevenDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const toast = useToast((s) => s.push);

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'daily', startDate, endDate, department, location],
    queryFn: () => reportsApi.daily({ startDate, endDate, department: department || undefined, location: location || undefined }),
  });

  const onPrint = () => {
    document.body.classList.add('print-mode');
    window.print();
    setTimeout(() => document.body.classList.remove('print-mode'), 200);
  };

  const onDownloadCsv = () => {
    const url = reportsApi.dailyCsvUrl({ startDate, endDate, department: department || undefined, location: location || undefined });
    const a = document.createElement('a');
    a.href = url;
    a.click();
    toast('CSV download started', 'success');
  };

  return (
    <div>
      <FilterBar>
        <Field label="From"><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
        <Field label="To"><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
        <Field label="Department">
          <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">All</option>
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </Select>
        </Field>
        <Field label="Location">
          <Select value={location} onChange={(e) => setLocation(e.target.value)}>
            <option value="">All</option>
            {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
          </Select>
        </Field>
      </FilterBar>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="text-sm text-text-muted">
          {isLoading ? 'Loading...' : `${data?.summary.total ?? 0} records`}
          {data && (
            <span className="ml-3">
              <Badge tone="green">{data.summary.present} present</Badge>
              <span className="mx-1"> </span>
              <Badge tone="red">{data.summary.absent} absent</Badge>
              <span className="mx-1"> </span>
              <Badge tone="gray">{data.summary.weeklyOff} weekly off</Badge>
            </span>
          )}
        </div>
        <div className="flex gap-2 no-print">
          <button className="btn-outline" onClick={onPrint}>Print to PDF</button>
          <button className="btn-primary" onClick={onDownloadCsv}>Download CSV</button>
        </div>
      </div>

      <div className="card overflow-hidden">
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
                    <td className="px-4 py-2.5 font-mono text-xs">{entry ? fmtIstTime(entry) : '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{exit ? fmtIstTime(exit) : '—'}</td>
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
  );
}

function MonthlyReport() {
  const now = new Date();
  const [yearMonth, setYearMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'monthly', yearMonth, department, location],
    queryFn: () => reportsApi.monthly({ yearMonth, department: department || undefined, location: location || undefined }),
  });

  const isCompliant = data?.viewMode === 'compliant';

  return (
    <div>
      <FilterBar>
        <Field label="Month"><Input type="month" value={yearMonth} onChange={(e) => setYearMonth(e.target.value)} /></Field>
        <Field label="Department">
          <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">All</option>
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </Select>
        </Field>
        <Field label="Location">
          <Select value={location} onChange={(e) => setLocation(e.target.value)}>
            <option value="">All</option>
            {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
          </Select>
        </Field>
      </FilterBar>

      <div className="card overflow-hidden">
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
                <th className="px-4 py-3 font-semibold hidden xl:table-cell">OT</th>
                <th className="px-4 py-3 font-semibold hidden xl:table-cell">Equiv. Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={9} className="p-10 text-center text-text-muted">Loading...</td></tr>}
              {data?.rows.map((r) => (
                <tr key={r.employeeId} className="hover:bg-surface2/50">
                  <td className="px-4 py-2.5 font-mono text-xs">{r.empCode}</td>
                  <td className="px-4 py-2.5 font-medium">{r.name}</td>
                  <td className="px-4 py-2.5 text-xs hidden lg:table-cell">{r.department}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{r.presentDays}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{r.absentDays}</td>
                  <td className="px-4 py-2.5 font-mono text-xs hidden lg:table-cell">{r.weeklyOffDays}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{fmtHours(isCompliant ? r.totalCompliantHours : r.totalRealNetHours)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs hidden xl:table-cell">{fmtHours(r.totalOtHours)}</td>
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
  const now = new Date();
  const [yearMonth, setYearMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'department', yearMonth],
    queryFn: () => reportsApi.department({ yearMonth }),
  });

  return (
    <div>
      <FilterBar>
        <Field label="Month"><Input type="month" value={yearMonth} onChange={(e) => setYearMonth(e.target.value)} /></Field>
      </FilterBar>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface2">
            <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
              <th className="px-4 py-3 font-semibold">Department</th>
              <th className="px-4 py-3 font-semibold">Employees</th>
              <th className="px-4 py-3 font-semibold">Present</th>
              <th className="px-4 py-3 font-semibold">Absent</th>
              <th className="px-4 py-3 font-semibold">Compliant Hrs</th>
              <th className="px-4 py-3 font-semibold">OT Hrs</th>
              <th className="px-4 py-3 font-semibold">Attendance Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td colSpan={7} className="p-10 text-center text-text-muted">Loading...</td></tr>}
            {data?.rows.map((r) => (
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
  );
}

function LocationReport() {
  const now = new Date();
  const [yearMonth, setYearMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'location', yearMonth],
    queryFn: () => reportsApi.location({ yearMonth }),
  });

  return (
    <div>
      <FilterBar>
        <Field label="Month"><Input type="month" value={yearMonth} onChange={(e) => setYearMonth(e.target.value)} /></Field>
      </FilterBar>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              {fmtHours(r.totalCompliantHours)} compliant · {fmtHours(r.totalOtHours)} OT
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="card p-4 mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 no-print">
      {children}
    </div>
  );
}
