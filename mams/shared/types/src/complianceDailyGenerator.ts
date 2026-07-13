import type { ComplianceShift } from './employee.js';

export const COMPLIANCE_GENERATOR_VERSION = '1.0.0';

export const COMPLIANCE_SHIFT_ORDER: ComplianceShift[] = ['A', 'B', 'C'];

export const COMPLIANCE_SHIFT_BUFFER_PRESETS: Record<
  ComplianceShift,
  { nominalStart: string; bufferStart: string; bufferEnd: string }
> = {
  A: { nominalStart: '07:00', bufferStart: '06:50', bufferEnd: '07:20' },
  B: { nominalStart: '14:00', bufferStart: '13:50', bufferEnd: '14:20' },
  C: { nominalStart: '22:00', bufferStart: '21:50', bufferEnd: '22:20' },
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MIN_WORK_MS = (7 * 60 + 50) * 60 * 1000;
const MAX_WORK_MS = (8 * 60 + 10) * 60 * 1000;
const EXACT_8H_MS = 8 * 60 * 60 * 1000;

const TIME_HMS_MS_RE = /^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?$/;

export interface DailyCompliancePunchResult {
  checkIn: string;
  checkOut: string;
  checkOutNextDay: boolean;
  hoursWorked: number;
  hoursWorkedFormatted: string;
}

export interface GenerateDailyCompliancePunchesInput {
  /** Seed namespace, e.g. `${employeeId}:${date}` or `${yearMonth}:${date}`. */
  seedBase: string;
  alternateShift: ComplianceShift;
  bufferStart?: string;
  bufferEnd?: string;
}

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (Math.imul(31, h) + value.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1103515245, state) + 12345) >>> 0;
    return state / 0x100000000;
  };
}

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
    msFrac = parseInt(m[4].padEnd(3, '0').slice(0, 3), 10);
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
  const h = Math.floor(totalSec / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
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

/** Display duration as "7 hr 51 min" (whole minutes; no decimal hours). */
export function formatHoursAsHrMinFromMs(totalMs: number): string {
  const safeMs = Number.isFinite(totalMs) && totalMs > 0 ? totalMs : 0;
  const totalMinutes = Math.floor(safeMs / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} hr ${minutes} min`;
}

/** Convert decimal hours (e.g. 7.85) to "7 hr 51 min". */
export function formatHoursAsHrMin(hours: number): string {
  if (!Number.isFinite(hours) || hours < 0) return '—';
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h} hr ${m} min`;
}

function randomClockInMs(seedBase: string, bufferStartMs: number, bufferEndMs: number): number {
  const rand = seededRandom(hashString(`${seedBase}:in`));
  if (bufferEndMs <= bufferStartMs) return bufferStartMs;
  return Math.floor(bufferStartMs + rand() * (bufferEndMs - bufferStartMs));
}

function randomWorkDurationMs(seedBase: string): number {
  const rand = seededRandom(hashString(`${seedBase}:dur`));
  let durationMs: number;
  let attempts = 0;
  do {
    durationMs = Math.floor(MIN_WORK_MS + rand() * (MAX_WORK_MS - MIN_WORK_MS));
    attempts++;
  } while (durationMs === EXACT_8H_MS && attempts < 20);
  if (durationMs === EXACT_8H_MS) {
    durationMs = EXACT_8H_MS + 1000;
  }
  return durationMs;
}

/** Deterministic daily compliant clock-in/out using buffer presets (autogen demo rules). */
export function generateDailyCompliancePunches(
  input: GenerateDailyCompliancePunchesInput
): DailyCompliancePunchResult {
  const preset = COMPLIANCE_SHIFT_BUFFER_PRESETS[input.alternateShift];
  const bufferStart = input.bufferStart ?? preset.bufferStart;
  const bufferEnd = input.bufferEnd ?? preset.bufferEnd;
  const bufferStartMs = parseTimeHmsMs(bufferStart);
  const bufferEndMs = parseTimeHmsMs(bufferEnd);
  if (bufferStartMs === null || bufferEndMs === null) {
    throw new Error(`Invalid buffer times for shift ${input.alternateShift}`);
  }

  const inMs = randomClockInMs(input.seedBase, bufferStartMs, bufferEndMs);
  const durationMs = randomWorkDurationMs(input.seedBase);
  const out = addMsFromAnchor(inMs, durationMs);

  return {
    checkIn: formatTimeHmsMs(inMs),
    checkOut: formatTimeHmsMs(out.ms),
    checkOutNextDay: out.nextDay,
    hoursWorked: durationMs / (60 * 60 * 1000),
    hoursWorkedFormatted: formatHoursAsHrMinFromMs(durationMs),
  };
}

export function compareComplianceShift(a: ComplianceShift, b: ComplianceShift): number {
  return COMPLIANCE_SHIFT_ORDER.indexOf(a) - COMPLIANCE_SHIFT_ORDER.indexOf(b);
}

export function isSundayIstDate(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCDay() === 0;
}
