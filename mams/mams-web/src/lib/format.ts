/**
 * Display helpers. All times displayed in IST.
 */
const IST = 'Asia/Kolkata';

/** Shown when a table cell or field has no value. */
export const EMPTY_CELL = 'N/A';

export function displayOrEmpty(value: unknown): string {
  if (value == null || value === '') return EMPTY_CELL;
  return String(value);
}

export function fmtIstDate(d: Date | string | null): string {
  if (!d) return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function fmtIstTime(d: Date | string | null): string {
  if (!d) return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date);
}

/** Live header clock time in IST (e.g. 10:01:45 am). */
export function fmtIstHeaderTime(d: Date): string {
  return fmtIstTime(d);
}

/** Live header date line in IST (e.g. Monday, 8 June 2026). */
export function fmtIstHeaderDate(d: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/** Compact date for the app top bar (e.g. 29 Jun 2026). */
export function fmtIstTopBarDate(d: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/** Date + time with milliseconds in IST (Activity log). */
export function fmtIstDateTimeMs(d: Date | string | null): string {
  if (!d) return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  const base = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date);
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${base}.${ms}`;
}

export function fmtDate(yyyymmdd: string): string {
  // 'YYYY-MM-DD' -> 'DD/MM/YYYY' for Indian display convention.
  if (!yyyymmdd) return '-';
  const [y, m, d] = yyyymmdd.split('-');
  return `${d}/${m}/${y}`;
}

/** Short weekday from YYYY-MM-DD in IST (e.g. Mon, Tue). */
export function fmtWeekdayShort(yyyymmdd: string): string {
  if (!yyyymmdd) return '-';
  const date = new Date(`${yyyymmdd}T12:00:00+05:30`);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    weekday: 'short',
  }).format(date);
}

export function fmtNumber(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n);
}

export function fmtHours(h: number): string {
  if (Number.isNaN(h)) return '-';
  return `${h.toFixed(1)} h`;
}
