export type MainShiftLabel = 'Day Shift' | 'Night Shift';
export type AlternateShift = 'A' | 'B' | 'C';

export const MAIN_SHIFT_OPTIONS: MainShiftLabel[] = ['Day Shift', 'Night Shift'];

export const ALTERNATE_SHIFT_STARTS: Record<AlternateShift, string> = {
  A: '07:00',
  B: '14:00',
  C: '22:00',
};

export const ALTERNATE_SHIFT_OPTIONS: AlternateShift[] = ['A', 'B', 'C'];

export const COMPLIANCE_SHIFT_BUFFER_PRESETS: Record<
  AlternateShift,
  { nominalStart: string; bufferStart: string; bufferEnd: string }
> = {
  A: { nominalStart: '07:00', bufferStart: '06:50', bufferEnd: '07:20' },
  B: { nominalStart: '14:00', bufferStart: '13:50', bufferEnd: '14:20' },
  C: { nominalStart: '22:00', bufferStart: '21:50', bufferEnd: '22:20' },
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MINUTES_PER_DAY = 24 * 60;
const MAX_OVERNIGHT_DURATION_MS = 16 * 60 * 60 * 1000;

const TIME_HMS_MS_RE =
  /^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?$/;

/** Parse HH:mm, HH:mm:ss, or HH:mm:ss.SSS to ms since midnight, or null. */
export function parseTimeHmsMs(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const m = trimmed.match(TIME_HMS_MS_RE);
  if (!m) return null;
  const h = parseInt(m[1] ?? '', 10);
  const min = parseInt(m[2] ?? '', 10);
  const sec = m[3] !== undefined ? parseInt(m[3], 10) : 0;
  let msFrac = 0;
  if (m[4] !== undefined) {
    const raw = m[4];
    const padded = raw.padEnd(3, '0').slice(0, 3);
    msFrac = parseInt(padded, 10);
  }
  if (
    !Number.isFinite(h) ||
    !Number.isFinite(min) ||
    !Number.isFinite(sec) ||
    h < 0 ||
    h > 23 ||
    min < 0 ||
    min > 59 ||
    sec < 0 ||
    sec > 59
  ) {
    return null;
  }
  return ((h * 60 + min) * 60 + sec) * 1000 + msFrac;
}

export function formatTimeHmsMs(msSinceMidnight: number): string {
  const normalized = ((msSinceMidnight % MS_PER_DAY) + MS_PER_DAY) % MS_PER_DAY;
  const totalSec = Math.floor(normalized / 1000);
  const ms = normalized % 1000;
  const h = Math.floor(totalSec / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

/** Pad partial input to canonical HH:mm:ss.SSS when possible. */
export function normalizeTimeInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const parsed = parseTimeHmsMs(trimmed);
  if (parsed === null) return trimmed;
  return formatTimeHmsMs(parsed);
}

export function parseTimeHHmm(value: string): number | null {
  const ms = parseTimeHmsMs(value);
  if (ms === null) return null;
  return Math.floor(ms / 60000);
}

export function formatTimeHHmm(minutes: number): string {
  return formatTimeHmsMs(minutes * 60 * 1000).slice(0, 5);
}

export function formatDurationMs(totalMs: number): string {
  const hours = Math.floor(totalMs / (60 * 60 * 1000));
  const rem = totalMs % (60 * 60 * 1000);
  const minutes = Math.floor(rem / (60 * 1000));
  const secMs = rem % (60 * 1000);
  const seconds = Math.floor(secMs / 1000);
  const ms = secMs % 1000;
  const hLabel = hours === 1 ? 'hour' : 'hours';
  const mLabel = minutes === 1 ? 'minute' : 'minutes';
  let base = `${hours} ${hLabel} ${minutes} ${mLabel}`;
  if (seconds > 0 || ms > 0) {
    const sPart = ms > 0 ? `${seconds}.${String(ms).padStart(3, '0')}` : String(seconds);
    base += ` ${sPart} ${seconds === 1 && ms === 0 ? 'second' : 'seconds'}`;
  }
  return base;
}

export function formatDuration(totalMinutes: number): string {
  return formatDurationMs(totalMinutes * 60 * 1000);
}

export function workDurationMs(clockIn: string, clockOut: string): number | null {
  const inMs = parseTimeHmsMs(clockIn);
  const outMs = parseTimeHmsMs(clockOut);
  if (inMs === null || outMs === null) return null;
  if (inMs === outMs) return null;
  let duration: number;
  if (outMs > inMs) duration = outMs - inMs;
  else duration = MS_PER_DAY - inMs + outMs;
  if (duration <= 0 || (outMs <= inMs && duration > MAX_OVERNIGHT_DURATION_MS)) return null;
  return duration;
}

export function workDurationMinutes(clockIn: string, clockOut: string): number | null {
  const ms = workDurationMs(clockIn, clockOut);
  if (ms === null) return null;
  return Math.floor(ms / 60000);
}

export function addMilliseconds(
  time: string,
  msToAdd: number
): { time: string; nextDay: boolean } | null {
  const start = parseTimeHmsMs(time);
  if (start === null) return null;
  return addMsFromAnchor(start, msToAdd);
}

export function addMsFromAnchor(
  anchorMs: number,
  msToAdd: number
): { time: string; ms: number; nextDay: boolean } {
  const total = anchorMs + msToAdd;
  const dayOffset = total >= 0 ? Math.floor(total / MS_PER_DAY) : 0;
  const ms = ((total % MS_PER_DAY) + MS_PER_DAY) % MS_PER_DAY;
  return { time: formatTimeHmsMs(ms), ms, nextDay: dayOffset > 0 };
}

export function addMinutes(
  timeHHmm: string,
  minutesToAdd: number
): { time: string; nextDay: boolean } | null {
  const r = addMilliseconds(timeHHmm, minutesToAdd * 60 * 1000);
  if (!r) return null;
  return { time: r.time, nextDay: r.nextDay };
}

export function computeLateInMs(mainClockIn: string, lastAllowedLogin: string): number | null {
  const inMs = parseTimeHmsMs(mainClockIn);
  const allowedMs = parseTimeHmsMs(lastAllowedLogin);
  if (inMs === null || allowedMs === null) return null;
  return Math.max(0, inMs - allowedMs);
}

/** Late vs last allowed login (for generated alternate clock-in display). */
export function computeAlternateLateInMs(
  alternateClockIn: string,
  lastAllowedLogin: string
): number | null {
  return computeLateInMs(alternateClockIn, lastAllowedLogin);
}

export function formatEarlyBeforeLabel(earlyMs: number): string {
  const totalSec = Math.floor(earlyMs / 1000);
  const ms = earlyMs % 1000;
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  if (minutes > 0 && seconds === 0 && ms === 0) {
    return `On time: ${minutes} min before last allowed login`;
  }
  const parts: string[] = [];
  if (minutes > 0) parts.push(`${minutes} min`);
  if (seconds > 0 || ms > 0) {
    const s = ms > 0 ? `${seconds}.${String(ms).padStart(3, '0')}` : String(seconds);
    parts.push(`${s} sec`);
  }
  return `On time: ${parts.join(' ')} before last allowed login`;
}

export function formatAlternatePunchStatus(
  alternateClockIn: string,
  lastAllowedLogin: string
): { lateLabel: string | null; onTimeLabel: string | null } {
  const altMs = parseTimeHmsMs(alternateClockIn);
  const allowedMs = parseTimeHmsMs(lastAllowedLogin);
  if (altMs === null || allowedMs === null) {
    return { lateLabel: null, onTimeLabel: null };
  }
  const lateMs = Math.max(0, altMs - allowedMs);
  if (lateMs > 0) {
    return { lateLabel: formatLateInLabel(lateMs), onTimeLabel: null };
  }
  const earlyMs = allowedMs - altMs;
  if (earlyMs > 0) {
    return { lateLabel: null, onTimeLabel: formatEarlyBeforeLabel(earlyMs) };
  }
  return { lateLabel: null, onTimeLabel: 'On time: at last allowed login' };
}

export function formatLateInLabel(lateInMs: number): string | null {
  if (lateInMs <= 0) return null;
  const totalSec = Math.floor(lateInMs / 1000);
  const ms = lateInMs % 1000;
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  if (ms === 0 && seconds === 0) {
    return `Late in by ${minutes} min`;
  }
  if (minutes > 0 && seconds === 0 && ms === 0) {
    return `Late in by ${minutes} min`;
  }
  const parts: string[] = [];
  if (minutes > 0) parts.push(`${minutes} min`);
  if (seconds > 0 || ms > 0) {
    const s = ms > 0 ? `${seconds}.${String(ms).padStart(3, '0')}` : String(seconds);
    parts.push(`${s} sec`);
  }
  return `Late in by ${parts.join(' ')}`;
}

export function timeDeltaMs(a: string, b: string): number | null {
  const aMs = parseTimeHmsMs(a);
  const bMs = parseTimeHmsMs(b);
  if (aMs === null || bMs === null) return null;
  return bMs - aMs;
}

export interface AutogenerationInput {
  clockIn: string;
  clockOut: string;
  lastAllowedLogin: string;
  bufferStart: string;
  bufferEnd: string;
}

export interface AutogenerationErrors {
  clockIn?: string;
  clockOut?: string;
  lastAllowedLogin?: string;
  bufferStart?: string;
  bufferEnd?: string;
  general?: string;
}

/** Generated alternate punches: A + main late → clock in; clock in + (Y−X) → clock out. */
export interface AutogenerationGenerated {
  alternateClockIn: string;
  alternateClockOut: string;
  alternateClockOutNextDay: boolean;
  mainLateInMs: number;
  alternateLateInMs: number;
  lateInLabel: string | null;
  onTimeLabel: string | null;
  withinRange: boolean;
  rangeWarning: string | null;
}

export interface AutogenerationResult {
  durationMs: number | null;
  durationMinutes: number | null;
  durationFormatted: string | null;
  /** Main shift clock-in vs last allowed (drives offset added to A). */
  mainLateInMs: number;
  lateInMs: number;
  lateInLabel: string | null;
  generated: AutogenerationGenerated | null;
  alternateClockOut: string | null;
  alternateClockOutNextDay: boolean;
  errors: AutogenerationErrors;
}

function validateMainAndBuffer(
  input: AutogenerationInput,
  errors: AutogenerationErrors
): {
  durationMs: number | null;
  lateInMs: number | null;
  bufStartMs: number | null;
  bufEndMs: number | null;
} {
  const inMs = parseTimeHmsMs(input.clockIn);
  const outMs = parseTimeHmsMs(input.clockOut);
  const allowedMs = parseTimeHmsMs(input.lastAllowedLogin);

  if (!input.clockIn.trim()) errors.clockIn = 'Clock in time is required';
  else if (inMs === null) errors.clockIn = 'Invalid clock in time (use HH:mm:ss.SSS)';

  if (!input.clockOut.trim()) errors.clockOut = 'Clock out time is required';
  else if (outMs === null) errors.clockOut = 'Invalid clock out time (use HH:mm:ss.SSS)';

  if (!input.lastAllowedLogin.trim()) {
    errors.lastAllowedLogin = 'Last allowed login time is required';
  } else if (allowedMs === null) {
    errors.lastAllowedLogin = 'Invalid last allowed login time (use HH:mm:ss.SSS)';
  }

  let durationMs: number | null = null;
  if (inMs !== null && outMs !== null) {
    durationMs = workDurationMs(input.clockIn, input.clockOut);
    if (durationMs === null) {
      errors.clockOut = 'Clock out must be after clock in';
    }
  }

  const bufStartMs = parseTimeHmsMs(input.bufferStart);
  const bufEndMs = parseTimeHmsMs(input.bufferEnd);

  if (!input.bufferStart.trim()) errors.bufferStart = 'Alternate range start (A) is required';
  else if (bufStartMs === null) errors.bufferStart = 'Invalid range start (A)';

  if (!input.bufferEnd.trim()) errors.bufferEnd = 'Alternate range end (B) is required';
  else if (bufEndMs === null) errors.bufferEnd = 'Invalid range end (B)';

  if (bufStartMs !== null && bufEndMs !== null && bufEndMs <= bufStartMs) {
    errors.bufferEnd = 'Range end (B) must be after range start (A)';
  }

  let lateInMs: number | null = null;
  if (inMs !== null && allowedMs !== null && !errors.clockIn && !errors.lastAllowedLogin) {
    lateInMs = computeLateInMs(input.clockIn, input.lastAllowedLogin);
  }

  return { durationMs, lateInMs, bufStartMs, bufEndMs };
}

/**
 * On-time on main → clock in at A. Late on main → B + same late ms as X (so reports match).
 */
export function computeAlternateClockInMs(
  rangeStartMs: number,
  rangeEndMs: number,
  mainLateInMs: number
): number {
  if (mainLateInMs <= 0) return rangeStartMs;
  return rangeEndMs + mainLateInMs;
}

function generateAlternatePunches(
  rangeStartMs: number,
  rangeEndMs: number,
  mainLateInMs: number,
  durationMs: number
): AutogenerationGenerated {
  const altInMs = computeAlternateClockInMs(rangeStartMs, rangeEndMs, mainLateInMs);
  const altIn = addMsFromAnchor(altInMs, 0);
  const altOut = addMsFromAnchor(altIn.ms, durationMs);
  const alternateLateInMs = mainLateInMs;
  const alternateOnTimeDeadline = formatTimeHmsMs(rangeEndMs);
  const status =
    mainLateInMs > 0
      ? { lateLabel: formatLateInLabel(mainLateInMs), onTimeLabel: null }
      : formatAlternatePunchStatus(altIn.time, alternateOnTimeDeadline);
  const withinRange = altIn.ms >= rangeStartMs && altIn.ms <= rangeEndMs;
  const rangeWarning = withinRange
    ? null
    : `Generated alternate clock-in ${altIn.time} is outside range A–B`;
  return {
    alternateClockIn: altIn.time,
    alternateClockOut: altOut.time,
    alternateClockOutNextDay: altOut.nextDay,
    mainLateInMs,
    alternateLateInMs,
    lateInLabel: status.lateLabel,
    onTimeLabel: status.onTimeLabel,
    withinRange,
    rangeWarning,
  };
}

export function computeAutogeneration(input: AutogenerationInput): AutogenerationResult {
  const errors: AutogenerationErrors = {};
  const { durationMs, lateInMs, bufStartMs, bufEndMs } = validateMainAndBuffer(input, errors);

  const mainValid =
    !errors.clockIn &&
    !errors.clockOut &&
    !errors.lastAllowedLogin &&
    durationMs !== null &&
    durationMs > 0;
  const bufferValid = !errors.bufferStart && !errors.bufferEnd;
  const resolvedLate = lateInMs ?? 0;

  let generated: AutogenerationGenerated | null = null;
  if (mainValid && bufferValid && durationMs !== null && bufStartMs !== null && bufEndMs !== null) {
    generated = generateAlternatePunches(bufStartMs, bufEndMs, resolvedLate, durationMs);
    if (generated.rangeWarning) errors.general = generated.rangeWarning;
  } else if (!mainValid && bufferValid && (input.bufferStart || input.bufferEnd)) {
    errors.general = 'Enter valid main shift times (X and Y) before calculating alternate punches';
  }

  return {
    durationMs,
    durationMinutes: durationMs !== null ? Math.floor(durationMs / 60000) : null,
    durationFormatted: durationMs !== null ? formatDurationMs(durationMs) : null,
    mainLateInMs: resolvedLate,
    lateInMs: resolvedLate,
    lateInLabel: formatLateInLabel(resolvedLate),
    generated,
    alternateClockOut: generated?.alternateClockOut ?? null,
    alternateClockOutNextDay: generated?.alternateClockOutNextDay ?? false,
    errors,
  };
}

export interface EmployeePunchInput {
  id: string;
  clockIn: string;
  clockOut: string;
}

export interface BatchSharedInput {
  lastAllowedLogin: string;
  bufferStart: string;
  bufferEnd: string;
}

export interface BatchEmployeeResult {
  id: string;
  lateInMs: number;
  lateInLabel: string | null;
  durationMs: number | null;
  durationFormatted: string | null;
  generated: AutogenerationGenerated | null;
  errors: AutogenerationErrors;
}

export interface BatchAutogenerationResult {
  employees: BatchEmployeeResult[];
  spacingOk: boolean;
  uniquenessOk: boolean;
  errors: AutogenerationErrors;
}

interface EmployeeComputed {
  id: string;
  clockIn: string;
  clockOut: string;
  clockInMs: number;
  durationMs: number;
  lateInMs: number;
  errors: AutogenerationErrors;
}

function enforceUniqueness(
  rows: Array<{ id: string; altInMs: number; durationMs: number }>
): Array<{ id: string; altInMs: number; altOutMs: number; altOutNextDay: boolean }> {
  const sorted = [...rows].sort((a, b) => a.altInMs - b.altInMs);
  let prevIn = -1;
  let prevOut = -1;
  const out: Array<{ id: string; altInMs: number; altOutMs: number; altOutNextDay: boolean }> = [];

  for (const row of sorted) {
    let altInMs = row.altInMs;
    if (altInMs <= prevIn) altInMs = prevIn + 1;
    let altOut = addMsFromAnchor(altInMs, row.durationMs);
    let altOutMs = altOut.ms;
    if (altOutMs <= prevOut) {
      altOutMs = prevOut + 1;
      altOut = { ...altOut, ms: altOutMs, time: formatTimeHmsMs(altOutMs) };
    }
    out.push({
      id: row.id,
      altInMs,
      altOutMs,
      altOutNextDay: altOut.nextDay || altOutMs < altInMs,
    });
    prevIn = altInMs;
    prevOut = altOutMs;
  }

  return out;
}

function applyBatchSpacing(
  employees: EmployeeComputed[],
  rangeStartMs: number,
  rangeEndMs: number,
  alternateOnTimeDeadline: string
): Map<string, AutogenerationGenerated> {
  const sorted = [...employees].sort((a, b) => a.clockInMs - b.clockInMs);
  const ref = sorted[0];
  const result = new Map<string, AutogenerationGenerated>();
  if (!ref) return result;

  const rows = sorted.map((e) => {
    let altInMs: number;
    if (e.lateInMs > 0) {
      altInMs = rangeEndMs + e.lateInMs;
    } else {
      altInMs = rangeStartMs + (e.clockInMs - ref.clockInMs);
    }
    return {
      id: e.id,
      altInMs,
      durationMs: e.durationMs,
      lateInMs: e.lateInMs,
    };
  });

  const unique = enforceUniqueness(rows);
  const byId = new Map(unique.map((u) => [u.id, u]));

  for (const e of sorted) {
    const u = byId.get(e.id)!;
    const alternateClockIn = formatTimeHmsMs(u.altInMs);
    const alternateLateInMs = e.lateInMs;
    const status =
      e.lateInMs > 0
        ? { lateLabel: formatLateInLabel(e.lateInMs), onTimeLabel: null }
        : formatAlternatePunchStatus(alternateClockIn, alternateOnTimeDeadline);
    const withinRange = u.altInMs >= rangeStartMs && u.altInMs <= rangeEndMs;
    result.set(e.id, {
      alternateClockIn,
      alternateClockOut: formatTimeHmsMs(u.altOutMs),
      alternateClockOutNextDay: u.altOutNextDay,
      mainLateInMs: e.lateInMs,
      alternateLateInMs,
      lateInLabel: status.lateLabel,
      onTimeLabel: status.onTimeLabel,
      withinRange,
      rangeWarning: withinRange
        ? null
        : `Generated alternate clock-in ${alternateClockIn} is outside range A–B`,
    });
  }
  return result;
}

export function computeAutogenerationBatch(
  employees: EmployeePunchInput[],
  shared: BatchSharedInput
): BatchAutogenerationResult {
  const sharedErrors: AutogenerationErrors = {};
  const allowedMs = parseTimeHmsMs(shared.lastAllowedLogin);
  const bufStartMs = parseTimeHmsMs(shared.bufferStart);
  const bufEndMs = parseTimeHmsMs(shared.bufferEnd);

  if (!shared.lastAllowedLogin.trim()) {
    sharedErrors.lastAllowedLogin = 'Last allowed login time is required';
  } else if (allowedMs === null) {
    sharedErrors.lastAllowedLogin = 'Invalid last allowed login time';
  }

  if (!shared.bufferStart.trim()) sharedErrors.bufferStart = 'Buffer start is required';
  else if (bufStartMs === null) sharedErrors.bufferStart = 'Invalid buffer start time';

  if (!shared.bufferEnd.trim()) sharedErrors.bufferEnd = 'Buffer end is required';
  else if (bufEndMs === null) sharedErrors.bufferEnd = 'Invalid buffer end time';

  if (bufStartMs !== null && bufEndMs !== null && bufEndMs <= bufStartMs) {
    sharedErrors.bufferEnd = 'Buffer end must be after buffer start';
  }

  const computed: EmployeeComputed[] = employees.map((emp) => {
    const errors: AutogenerationErrors = { ...sharedErrors };
    const inMs = parseTimeHmsMs(emp.clockIn);
    const outMs = parseTimeHmsMs(emp.clockOut);

    if (!emp.clockIn.trim()) errors.clockIn = 'Clock in is required';
    else if (inMs === null) errors.clockIn = 'Invalid clock in time';

    if (!emp.clockOut.trim()) errors.clockOut = 'Clock out is required';
    else if (outMs === null) errors.clockOut = 'Invalid clock out time';

    let durationMs: number | null = null;
    if (inMs !== null && outMs !== null) {
      durationMs = workDurationMs(emp.clockIn, emp.clockOut);
      if (durationMs === null) errors.clockOut = 'Clock out must be after clock in';
    }

    let lateInMs = 0;
    if (inMs !== null && allowedMs !== null && !errors.clockIn && !errors.lastAllowedLogin) {
      lateInMs = computeLateInMs(emp.clockIn, shared.lastAllowedLogin) ?? 0;
    }

    return {
      id: emp.id,
      clockIn: emp.clockIn,
      clockOut: emp.clockOut,
      clockInMs: inMs ?? 0,
      durationMs: durationMs ?? 0,
      lateInMs,
      errors,
    };
  });

  const bufferValid = !sharedErrors.bufferStart && !sharedErrors.bufferEnd;
  const allMainValid = computed.every(
    (e) =>
      !e.errors.clockIn &&
      !e.errors.clockOut &&
      !e.errors.lastAllowedLogin &&
      e.durationMs > 0
  );

  let spacingOk = true;
  let uniquenessOk = true;

  const employeeResults: BatchEmployeeResult[] = computed.map((e) => ({
    id: e.id,
    lateInMs: e.lateInMs,
    lateInLabel: formatLateInLabel(e.lateInMs),
    durationMs: e.durationMs > 0 ? e.durationMs : null,
    durationFormatted: e.durationMs > 0 ? formatDurationMs(e.durationMs) : null,
    generated: null,
    errors: e.errors,
  }));

  if (bufferValid && allMainValid && bufStartMs !== null && bufEndMs !== null) {
    const byId = applyBatchSpacing(
      computed,
      bufStartMs,
      bufEndMs,
      shared.bufferEnd
    );

    for (let i = 0; i < computed.length; i++) {
      const emp = computed[i]!;
      const res = employeeResults[i]!;
      res.generated = byId.get(emp.id) ?? null;
    }

    if (employees.length >= 2) {
      const a = computed[0]!;
      const b = computed[1]!;
      const mainDelta = b.clockInMs - a.clockInMs;
      const sv0 = byId.get(a.id);
      const sv1 = byId.get(b.id);
      if (sv0 && sv1) {
        const altIn0 = parseTimeHmsMs(sv0.alternateClockIn);
        const altIn1 = parseTimeHmsMs(sv1.alternateClockIn);
        if (altIn0 !== null && altIn1 !== null) {
          spacingOk = altIn1 - altIn0 === mainDelta;
        }
      }
      const ins = employees.map((e) => byId.get(e.id)?.alternateClockIn).filter(Boolean);
      const outs = employees.map((e) => byId.get(e.id)?.alternateClockOut).filter(Boolean);
      uniquenessOk =
        ins.length === employees.length &&
        new Set(ins).size === ins.length &&
        new Set(outs).size === outs.length;
    }
  }

  return {
    employees: employeeResults,
    spacingOk,
    uniquenessOk,
    errors: sharedErrors,
  };
}

export function alternateShiftLabel(shift: AlternateShift): string {
  return `${shift}: starts ${ALTERNATE_SHIFT_STARTS[shift]}`;
}

export function mainShiftShortLabel(main: MainShiftLabel): string {
  return main === 'Night Shift' ? 'Night Shift' : 'Day Shift';
}
