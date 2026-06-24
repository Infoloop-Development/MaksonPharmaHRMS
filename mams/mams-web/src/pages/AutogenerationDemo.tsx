import { useMemo, useState } from 'react';
import { Field, Input, Select } from '../components/ui/Field';
import { Badge } from '../components/ui/Badge';
import { ComplianceMonthCalendar } from '../components/autogen/ComplianceMonthCalendar';
import { computeMonthlyPlan, formatCheckOutLabel, type MonthlyPlanDay } from '../lib/monthlyCompliancePlanner';
import {
  ALTERNATE_SHIFT_OPTIONS,
  ALTERNATE_SHIFT_STARTS,
  COMPLIANCE_SHIFT_BUFFER_PRESETS,
  MAIN_SHIFT_OPTIONS,
  alternateShiftLabel,
  computeAutogeneration,
  computeAutogenerationBatch,
  formatTimeHmsMs,
  normalizeTimeInput,
  parseTimeHmsMs,
  type AlternateShift,
  type MainShiftLabel,
} from '../lib/shiftAutogeneration';

const TIME_HINT = '24-hour format: HH:mm:ss.SSS (e.g. 09:00:00.000)';
const BUFFER_HINT = '24-hour format: HH:mm (e.g. 06:50)';

function defaultYearMonth() {
  return new Date().toISOString().slice(0, 7);
}

function BufferTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label} hint={BUFFER_HINT}>
      <Input
        className="font-mono"
        placeholder="HH:mm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          const n = normalizeTimeInput(value);
          if (n !== value) onChange(n.slice(0, 5));
        }}
      />
    </Field>
  );
}

function statusLabel(status: string) {
  switch (status) {
    case 'present':
      return 'Present';
    case 'leave':
      return 'Leave';
    case 'weeklyOff':
      return 'Weekly Off';
    default:
      return '—';
  }
}

function TimeField({
  label,
  value,
  onChange,
  error,
  hint,
  readOnly,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  error?: string;
  hint?: string;
  readOnly?: boolean;
}) {
  return (
    <Field label={label} error={error} hint={hint ?? TIME_HINT}>
      <Input
        readOnly={readOnly}
        className={`font-mono ${readOnly ? 'bg-surface2 cursor-default' : ''}`}
        placeholder="HH:mm:ss.SSS"
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        onBlur={
          onChange
            ? () => {
                const n = normalizeTimeInput(value);
                if (n !== value) onChange(n);
              }
            : undefined
        }
      />
    </Field>
  );
}

function LateLabel({ label }: { label: string | null }) {
  if (!label) return null;
  return <div className="text-[11px] text-red font-semibold mt-1">{label}</div>;
}

function OnTimeLabel({ label }: { label: string | null }) {
  if (!label) return null;
  return <div className="text-[11px] text-primary-on-bg font-semibold mt-1">{label}</div>;
}

function AlternateStatus({ late, onTime }: { late: string | null; onTime: string | null }) {
  return (
    <>
      <LateLabel label={late} />
      <OnTimeLabel label={onTime} />
    </>
  );
}

function formatOutDisplay(time: string, nextDay: boolean) {
  return formatCheckOutLabel(time, nextDay);
}

function ComplianceDayRow({ day }: { day: MonthlyPlanDay }) {
  return (
    <tr className="border-b border-border/60 hover:bg-surface2/50 transition-colors">
      <td className="py-2.5 pr-4 font-mono text-xs text-text">{day.date}</td>
      <td className="py-2.5 pr-4 text-text">{day.weekday}</td>
      <td className="py-2.5 pr-4">
        <DayStatusBadge status={day.status} />
      </td>
      <td className="py-2.5 pr-4 text-sm text-text max-w-[120px] truncate" title={day.involvedPerson ?? undefined}>
        {day.involvedPerson ?? '—'}
      </td>
      <td className="py-2.5 pr-4 font-mono text-xs text-text">{day.checkIn ?? '—'}</td>
      <td className="py-2.5 pr-4 font-mono text-xs text-text">
        {day.checkOut ? formatCheckOutLabel(day.checkOut, day.checkOutNextDay) : '—'}
      </td>
      <td className="py-2.5 pr-4 font-mono text-xs text-primary-on-bg">{day.hoursWorkedFormatted ?? '—'}</td>
    </tr>
  );
}

function ComplianceDayCard({ day }: { day: MonthlyPlanDay }) {
  return (
    <article className="rounded-lg border border-border bg-surface p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-mono text-xs text-text">{day.date}</div>
          <div className="text-sm text-text-muted">{day.weekday}</div>
        </div>
        <DayStatusBadge status={day.status} />
      </div>
      {day.involvedPerson && (
        <div className="text-sm">
          <span className="text-text-subtle text-xs uppercase tracking-wide">Involved · </span>
          <span className="text-text font-medium">{day.involvedPerson}</span>
        </div>
      )}
      {day.status === 'present' && (
        <dl className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="rounded bg-surface2 px-2 py-1.5">
            <dt className="text-text-subtle text-[10px] uppercase">Check in</dt>
            <dd className="text-text mt-0.5">{day.checkIn ?? '—'}</dd>
          </div>
          <div className="rounded bg-surface2 px-2 py-1.5">
            <dt className="text-text-subtle text-[10px] uppercase">Check out</dt>
            <dd className="text-text mt-0.5">
              {day.checkOut ? formatCheckOutLabel(day.checkOut, day.checkOutNextDay) : '—'}
            </dd>
          </div>
          <div className="col-span-2 rounded bg-primary-bg/50 px-2 py-1.5">
            <dt className="text-text-subtle text-[10px] uppercase">Hours worked</dt>
            <dd className="text-primary-on-bg font-semibold mt-0.5">{day.hoursWorkedFormatted ?? '—'}</dd>
          </div>
        </dl>
      )}
    </article>
  );
}

function DayStatusBadge({ status }: { status: MonthlyPlanDay['status'] }) {
  const tone =
    status === 'present' ? 'green' : status === 'leave' ? 'amber' : status === 'weeklyOff' ? 'gray' : 'blue';
  return <Badge tone={tone}>{statusLabel(status)}</Badge>;
}

export function AutogenerationDemo() {
  const presetA = COMPLIANCE_SHIFT_BUFFER_PRESETS.A;
  const [yearMonth, setYearMonth] = useState(defaultYearMonth);
  const [monthlyShift, setMonthlyShift] = useState<AlternateShift>('A');
  const [monthlyBufferStart, setMonthlyBufferStart] = useState(presetA.bufferStart);
  const [monthlyBufferEnd, setMonthlyBufferEnd] = useState(presetA.bufferEnd);
  const [realHours, setRealHours] = useState('320');
  const [involvedPersonnel, setInvolvedPersonnel] = useState('Ravi Kumar, Priya Sharma');

  const [mainShift, setMainShift] = useState<MainShiftLabel>('Night Shift');
  const [alternateShift, setAlternateShift] = useState<AlternateShift>('A');
  const [clockIn, setClockIn] = useState('');
  const [clockOut, setClockOut] = useState('');
  const [lastAllowedLogin, setLastAllowedLogin] = useState('');
  const [bufferStart, setBufferStart] = useState('');
  const [bufferEnd, setBufferEnd] = useState('');

  const [empAClockIn, setEmpAClockIn] = useState('21:00:00.000');
  const [empAClockOut, setEmpAClockOut] = useState('05:00:00.000');
  const [empBClockIn, setEmpBClockIn] = useState('21:00:00.050');
  const [empBClockOut, setEmpBClockOut] = useState('05:00:00.050');

  const monthlyPlan = useMemo(
    () =>
      computeMonthlyPlan({
        yearMonth,
        shift: monthlyShift,
        bufferStart: monthlyBufferStart,
        bufferEnd: monthlyBufferEnd,
        realHours: parseFloat(realHours) || 0,
        involvedPersonnel,
      }),
    [yearMonth, monthlyShift, monthlyBufferStart, monthlyBufferEnd, realHours, involvedPersonnel]
  );

  const onMonthlyShiftChange = (shift: AlternateShift) => {
    setMonthlyShift(shift);
    const preset = COMPLIANCE_SHIFT_BUFFER_PRESETS[shift];
    setMonthlyBufferStart(preset.bufferStart);
    setMonthlyBufferEnd(preset.bufferEnd);
  };

  const result = useMemo(
    () =>
      computeAutogeneration({
        clockIn,
        clockOut,
        lastAllowedLogin,
        bufferStart,
        bufferEnd,
      }),
    [clockIn, clockOut, lastAllowedLogin, bufferStart, bufferEnd]
  );

  const batchResult = useMemo(
    () =>
      computeAutogenerationBatch(
        [
          { id: 'A', clockIn: empAClockIn, clockOut: empAClockOut },
          { id: 'B', clockIn: empBClockIn, clockOut: empBClockOut },
        ],
        { lastAllowedLogin, bufferStart, bufferEnd }
      ),
    [empAClockIn, empAClockOut, empBClockIn, empBClockOut, lastAllowedLogin, bufferStart, bufferEnd]
  );

  const shiftStart = ALTERNATE_SHIFT_STARTS[alternateShift];
  const gen = result.generated;

  const empA = batchResult.employees.find((e) => e.id === 'A');
  const empB = batchResult.employees.find((e) => e.id === 'B');
  const mainInDeltaMs =
    parseTimeHmsMs(empAClockIn) !== null && parseTimeHmsMs(empBClockIn) !== null
      ? parseTimeHmsMs(empBClockIn)! - parseTimeHmsMs(empAClockIn)!
      : null;
  const altInDeltaMs =
    empA?.generated && empB?.generated
      ? parseTimeHmsMs(empB.generated.alternateClockIn)! -
        parseTimeHmsMs(empA.generated.alternateClockIn)!
      : null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Auto Genrated Shift Demo</h1>
        <p className="text-sm text-text-muted mt-1">
          Monthly compliance planner for 26-day / 208-hour baselines, plus a single-day punch calculator below.
        </p>
      </div>

      <div className="card p-4 md:p-6 mb-4 border-l-4 border-l-primary">
        <h2 className="text-lg font-bold mb-4">Monthly compliance planner</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <Field label="Month">
            <Input type="month" value={yearMonth} onChange={(e) => setYearMonth(e.target.value)} />
          </Field>
          <Field label="Compliance shift">
            <Select value={monthlyShift} onChange={(e) => onMonthlyShiftChange(e.target.value as AlternateShift)}>
              {ALTERNATE_SHIFT_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {alternateShiftLabel(s)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Real hours worked (month)" hint="Number · decimal hours">
            <Input
              type="number"
              min={0}
              step={0.5}
              value={realHours}
              onChange={(e) => setRealHours(e.target.value)}
              placeholder="e.g. 320"
            />
          </Field>
          <Field
            label="Personnel involved"
            hint="Comma-separated names — rotated across present days"
          >
            <Input
              value={involvedPersonnel}
              onChange={(e) => setInvolvedPersonnel(e.target.value)}
              placeholder="e.g. Ravi Kumar, Priya Sharma"
            />
          </Field>
          <BufferTimeField
            label="Compliance clock-in buffer start"
            value={monthlyBufferStart}
            onChange={setMonthlyBufferStart}
          />
          <BufferTimeField
            label="Compliance clock-in buffer end"
            value={monthlyBufferEnd}
            onChange={setMonthlyBufferEnd}
          />
        </div>

        {'error' in monthlyPlan ? (
          <p className="text-sm text-red">{monthlyPlan.error}</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 p-4 rounded-lg bg-surface2 border border-border text-sm">
              <div>
                <div className="text-text-muted text-xs uppercase tracking-wide">Baseline</div>
                <div className="font-semibold mt-1 text-text">
                  {monthlyPlan.summary.baselineDays} days · {monthlyPlan.summary.baselineHours} h
                </div>
              </div>
              <div>
                <div className="text-text-muted text-xs uppercase tracking-wide">Real hours entered</div>
                <div className="font-semibold mt-1 text-text">{monthlyPlan.summary.realHours} h</div>
              </div>
              <div>
                <div className="text-text-muted text-xs uppercase tracking-wide">Present / Leave days</div>
                <div className="font-semibold mt-1 text-text">
                  {monthlyPlan.summary.presentDays} present · {monthlyPlan.summary.leaveDays} leave
                </div>
              </div>
              <div>
                <div className="text-text-muted text-xs uppercase tracking-wide">
                  {monthlyPlan.summary.extraCashHours > 0 ? 'Extra cash hours' : 'Deducted hours'}
                </div>
                <div className="font-semibold mt-1 text-primary-on-bg">
                  {monthlyPlan.summary.extraCashHours > 0
                    ? `+${monthlyPlan.summary.extraCashHours} h (cash payment)`
                    : monthlyPlan.summary.deductedHours > 0
                      ? `${monthlyPlan.summary.deductedHours} h (${monthlyPlan.summary.leaveDays} leave days)`
                      : 'None'}
                </div>
              </div>
            </div>

            {monthlyPlan.summary.calendarCapped && (
              <p className="text-xs text-amber bg-amber-bg/40 border border-amber/30 rounded-md px-3 py-2 mb-4">
                This month has {monthlyPlan.summary.eligibleWeekdays} Mon–Sat days (fewer than 26). Calendar
                shows {monthlyPlan.summary.calendarPresentDays} present and{' '}
                {monthlyPlan.summary.calendarLeaveDays} leave; summary uses the 26-day baseline model.
              </p>
            )}

            <h3 className="font-semibold mb-3">Calendar — {yearMonth}</h3>
            <ComplianceMonthCalendar weeks={monthlyPlan.calendarWeeks} />

            <h3 className="font-semibold mb-3 text-text">Daily attendance</h3>
            <p className="text-xs text-text-subtle mb-3">
              Present days show who was involved, check-in/check-out times (<span className="font-mono">HH:mm:ss</span>
              ), and decimal hours.
            </p>

            <div className="md:hidden space-y-2 mb-2">
              {monthlyPlan.days
                .filter((d) => d.status !== 'unassigned')
                .map((d) => (
                  <ComplianceDayCard key={d.date} day={d} />
                ))}
            </div>

            <div className="hidden md:block overflow-x-auto tbl-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-muted uppercase border-b border-border">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Weekday</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Involved</th>
                    <th className="py-2 pr-4">
                      Check in
                      <span className="block normal-case text-text-subtle font-normal">HH:mm:ss</span>
                    </th>
                    <th className="py-2 pr-4">
                      Check out
                      <span className="block normal-case text-text-subtle font-normal">HH:mm:ss</span>
                    </th>
                    <th className="py-2 pr-4">
                      Hours
                      <span className="block normal-case text-text-subtle font-normal">decimal</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyPlan.days
                    .filter((d) => d.status !== 'unassigned')
                    .map((d) => (
                      <ComplianceDayRow key={d.date} day={d} />
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <details className="card p-4 md:p-6 mb-4 group">
        <summary className="text-lg font-bold cursor-pointer list-none flex items-center gap-2">
          <span className="text-text-muted group-open:rotate-90 transition-transform">▸</span>
          Single-day punch demo
        </summary>
        <div className="mt-6 space-y-4">

      <div className="card p-4 md:p-6 mb-4 border-l-4 border-l-amber bg-amber-bg/40">
        <h2 className="text-lg font-bold mb-3">How it works — leave, lateness, and the maths</h2>

        <div className="space-y-4 text-sm text-text">
          <section>
            <h3 className="font-semibold text-base mb-2">When there is no main shift punch (leave)</h3>
            <p className="text-text-muted leading-relaxed">
              If an employee <strong>does not clock in on the main shift</strong> (no real punch for that day),
              the system treats that day as <strong>leave on the main shift</strong>.
            </p>
            <p className="text-text-muted leading-relaxed mt-2">
              The <strong>alternate (auto-generated) shift follows the same rule</strong>: there is no
              alternate clock-in or clock-out to generate — that day is also <strong>leave on the alternate
              shift</strong>. You will not see generated alternate times below until valid main punches (X and Y)
              are entered.
            </p>
            <p className="text-text-muted leading-relaxed mt-2">
              If <strong>leave is already scheduled</strong> on the main shift (planned absence), that status is
              <strong> mirrored on the alternate shift</strong> as well — both records stay in sync for
              reporting.
            </p>
          </section>

          <section className="pt-2 border-t border-border/60">
            <h3 className="font-semibold text-base mb-2">When the employee did work (this calculator)</h3>
            <p className="text-text-muted leading-relaxed mb-3">
              Think of two shifts on the same day: the <strong>real</strong> shift (what actually happened) and
              the <strong>alternate</strong> shift (times created for compliance reports). They should tell the
              same story — especially <strong>how late</strong> someone was and <strong>how long</strong> they
              worked.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-text-muted leading-relaxed">
              <li>
                <strong>X</strong> — real clock-in on the main shift (e.g. night shift).
              </li>
              <li>
                <strong>Y</strong> — real clock-out on the main shift.
              </li>
              <li>
                <strong>A</strong> — earliest allowed alternate clock-in (start of the window).
              </li>
              <li>
                <strong>B</strong> — last on-time alternate clock-in (end of the on-time window).
              </li>
              <li>
                <strong>Last on-time login (main)</strong> — if X is after this, the employee was late on the
                main shift.
              </li>
            </ul>
          </section>

          <section className="pt-2 border-t border-border/60">
            <h3 className="font-semibold text-base mb-2">Step-by-step calculation</h3>
            <ol className="list-decimal pl-5 space-y-2 text-text-muted leading-relaxed">
              <li>
                <strong>How late on main?</strong>
                <br />
                <span className="font-mono text-xs text-text">
                  late = X − last on-time (main), if positive; otherwise zero
                </span>
                <br />
                Example: X at 21:34:32 and last on-time 21:30 → about 4 minutes 32 seconds late (shown in red
                under X).
              </li>
              <li>
                <strong>Alternate clock-in</strong>
                <br />
                If <strong>not late</strong> on main: alternate in = <strong>A</strong>.
                <br />
                If <strong>late</strong> on main: alternate in = <strong>B + the same late amount</strong> (so
                reports show the same lateness on both shifts).
                <br />
                <span className="font-mono text-xs text-text">
                  Example: B = 07:30 and same 4m 32s late → alternate in = 07:34:32
                </span>
              </li>
              <li>
                <strong>How long did they work?</strong>
                <br />
                <span className="font-mono text-xs text-text">worked = Y − X</span> (overnight shifts are
                handled — e.g. night in to morning out).
              </li>
              <li>
                <strong>Alternate clock-out</strong>
                <br />
                <span className="font-mono text-xs text-text">alternate out = alternate in + worked</span>
                <br />
                The alternate shift lasts exactly as long as the real shift; only the clock-in time is shifted
                into the alternate window.
              </li>
            </ol>
          </section>

          <p className="text-xs text-text-subtle pt-2 border-t border-border/60">
            This demo does not save data. It is for testers and developers to verify the rules before they are
            applied in live attendance.
          </p>
        </div>
      </div>

      <div className="card p-4 md:p-6 mb-4">
        <h2 className="text-lg font-bold mb-4">Shift selection</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Main Shift">
            <Select value={mainShift} onChange={(e) => setMainShift(e.target.value as MainShiftLabel)}>
              {MAIN_SHIFT_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Alternate Shift">
            <Select value={alternateShift} onChange={(e) => setAlternateShift(e.target.value as AlternateShift)}>
              {ALTERNATE_SHIFT_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {alternateShiftLabel(s)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>

      <div className="card p-4 md:p-6 mb-4">
        <h2 className="text-lg font-bold mb-4">Main shift (real) — X and Y</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <TimeField
              label={`Clock in (X) for ${mainShift}`}
              value={clockIn}
              onChange={setClockIn}
              error={result.errors.clockIn}
            />
            <LateLabel label={result.lateInLabel} />
          </div>
          <TimeField
            label={`Clock out (Y) for ${mainShift}`}
            value={clockOut}
            onChange={setClockOut}
            error={result.errors.clockOut}
          />
        </div>
        <div className="mt-4 max-w-md">
          <TimeField
            label="Last on-time login (for late check on X)"
            value={lastAllowedLogin}
            onChange={setLastAllowedLogin}
            error={result.errors.lastAllowedLogin}
            hint="Late on main (X minus this time) is applied to alternate as B + same late duration."
          />
        </div>
      </div>

      <div className="card p-4 md:p-6 mb-4 bg-surface2">
        <h2 className="text-lg font-bold mb-2">Working duration (Y − X)</h2>
        <p className="text-sm text-text-muted mb-2">
          This span is added to alternate clock-in to get alternate clock-out.
        </p>
        <div className="font-mono text-xl font-semibold text-text">
          {result.durationFormatted ?? '—'}
        </div>
      </div>

      <div className="card p-4 md:p-6 mb-4">
        <h2 className="text-lg font-bold mb-4">Alternate range A – B</h2>
        <p className="text-sm text-text-muted mb-4">
          Shift {alternateShift} nominal start {shiftStart}. <strong>A</strong> = earliest alternate in (on-time).
          <strong> B</strong> = last on-time alternate login; if X is late, alternate in = <strong>B + same late as main</strong>.
          Example: A = 06:50:00.000, B = 07:30:00.000.
        </p>
        {result.errors.general && (
          <div className="text-sm text-amber mb-3">{result.errors.general}</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TimeField
            label="A — alternate range start (on-time clock-in)"
            value={bufferStart}
            onChange={setBufferStart}
            error={result.errors.bufferStart}
          />
          <TimeField
            label="B — last on-time alternate login (late anchor)"
            value={bufferEnd}
            onChange={setBufferEnd}
            error={result.errors.bufferEnd}
            hint="If main X is late, generated alternate in = B + (X − main last on-time). Late label on alternate uses B."
          />
        </div>
      </div>

      <div className="card p-4 md:p-6 mb-4 border-l-4 border-l-primary">
        <h2 className="text-lg font-bold mb-2">Generated alternate shift</h2>
        <p className="text-xs text-text-muted mb-4 font-mono">
          On-time: alternate in = A · Late: alternate in = B + (X − main last on-time) · out = in + (Y − X)
        </p>
        {!gen ? (
          <p className="text-sm text-text-muted">Enter valid X, Y, A, B, and last on-time login above.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Alternate clock in (read-only)">
              <Input readOnly className="bg-surface2 font-mono cursor-default" value={gen.alternateClockIn} />
              <AlternateStatus late={gen.lateInLabel} onTime={gen.onTimeLabel} />
            </Field>
            <Field label="Alternate clock out (read-only)">
              <Input
                readOnly
                className="bg-surface2 font-mono cursor-default"
                value={formatOutDisplay(gen.alternateClockOut, gen.alternateClockOutNextDay)}
              />
              <AlternateStatus late={gen.lateInLabel} onTime={gen.onTimeLabel} />
            </Field>
          </div>
        )}
      </div>

      <div className="card p-4 md:p-6 mb-4 border-l-4 border-l-amber">
        <h2 className="text-lg font-bold mb-2">Compare two employees (ms spacing)</h2>
        <p className="text-sm text-text-muted mb-4">
          Same A and formulas; gap between main X values is preserved on alternate clock-in (never identical
          timestamps).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-muted uppercase border-b border-border">
                <th className="py-2 pr-4">Employee</th>
                <th className="py-2 pr-4">Main X</th>
                <th className="py-2 pr-4">Main Y</th>
                <th className="py-2 pr-4">Alternate in</th>
                <th className="py-2 pr-4">Alternate out</th>
              </tr>
            </thead>
            <tbody>
              {(['A', 'B'] as const).map((id) => {
                const emp = id === 'A' ? empA : empB;
                const g = emp?.generated;
                const cin = id === 'A' ? empAClockIn : empBClockIn;
                const cout = id === 'A' ? empAClockOut : empBClockOut;
                const setCin = id === 'A' ? setEmpAClockIn : setEmpBClockIn;
                const setCout = id === 'A' ? setEmpAClockOut : setEmpBClockOut;
                return (
                  <tr key={id} className="border-b border-border/60 align-top">
                    <td className="py-3 pr-4 font-bold">Employee {id}</td>
                    <td className="py-3 pr-4">
                      <Input
                        className="font-mono text-xs"
                        value={cin}
                        onChange={(e) => setCin(e.target.value)}
                        onBlur={() => setCin(normalizeTimeInput(cin))}
                      />
                      <LateLabel label={emp?.lateInLabel ?? null} />
                    </td>
                    <td className="py-3 pr-4">
                      <Input
                        className="font-mono text-xs"
                        value={cout}
                        onChange={(e) => setCout(e.target.value)}
                        onBlur={() => setCout(normalizeTimeInput(cout))}
                      />
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      {g?.alternateClockIn ?? '—'}
                      <AlternateStatus late={g?.lateInLabel ?? null} onTime={g?.onTimeLabel ?? null} />
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      {g ? formatOutDisplay(g.alternateClockOut, g.alternateClockOutNextDay) : '—'}
                      <AlternateStatus late={g?.lateInLabel ?? null} onTime={g?.onTimeLabel ?? null} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {mainInDeltaMs !== null && altInDeltaMs !== null && (
          <div
            className={`mt-4 text-sm font-mono ${batchResult.spacingOk ? 'text-primary-on-bg' : 'text-red'}`}
          >
            Main Δ: {mainInDeltaMs} ms · Alternate Δ: {altInDeltaMs} ms
            {batchResult.spacingOk ? ' (match)' : ' (mismatch)'}
            {!batchResult.uniquenessOk && (
              <span className="text-red block mt-1">Duplicate alternate timestamps detected</span>
            )}
          </div>
        )}
      </div>
        </div>
      </details>
    </div>
  );
}
