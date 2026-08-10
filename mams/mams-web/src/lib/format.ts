/**
 * Display helpers. All times displayed in IST.
 */
const IST = 'Asia/Kolkata';

/** Shown when a table cell or field has no value. */
export const EMPTY_CELL = 'N/A';

function toValidDate(d: Date | string | null | undefined): Date | null {
  if (d == null || d === '') return null;
  const date = typeof d === 'string' ? new Date(d) : d;
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return date;
}

export function displayOrEmpty(value: unknown): string {
  if (value == null || value === '') return EMPTY_CELL;
  return String(value);
}

export function fmtIstDate(d: Date | string | null): string {
  const date = toValidDate(d);
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function fmtIstTime(d: Date | string | null): string {
  const date = toValidDate(d);
  if (!date) return '-';
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
  const date = toValidDate(d);
  if (!date) return '-';
  const base = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
    .format(date)
    .replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  const periodMatch = /^(.*?)(\s(AM|PM))$/.exec(base);
  if (periodMatch) return `${periodMatch[1]}.${ms}${periodMatch[2]}`;
  return `${base}.${ms}`;
}

/** Time with milliseconds, IST, no date part. Pairs with fmtIstDate for 2-line table cells. */
export function fmtIstTimeMs(d: Date | string | null): string {
  const date = toValidDate(d);
  if (!date) return '-';
  const base = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
    .format(date)
    .replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  const periodMatch = /^(.*?)(\s(AM|PM))$/.exec(base);
  if (periodMatch) return `${periodMatch[1]}.${ms}${periodMatch[2]}`;
  return `${base}.${ms}`;
}

/**
 * Format a calendar date for display.
 * Accepts YYYY-MM-DD or any parseable ISO datetime (submittedAt, etc.).
 */
export function fmtDate(value: string | Date | null | undefined): string {
  if (value == null || value === '') return '-';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fmtIstDate(`${value}T12:00:00+05:30`);
  }
  return fmtIstDate(value);
}

/** Full weekday name from YYYY-MM-DD in IST (e.g. Monday, Friday). */
export function fmtWeekdayFull(yyyymmdd: string): string {
  if (!yyyymmdd) return '-';
  const date = toValidDate(
    /^\d{4}-\d{2}-\d{2}$/.test(yyyymmdd) ? `${yyyymmdd}T12:00:00+05:30` : yyyymmdd
  );
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    weekday: 'long',
  }).format(date);
}

/** Short weekday from YYYY-MM-DD in IST (e.g. Mon, Tue). */
export function fmtWeekdayShort(yyyymmdd: string): string {
  if (!yyyymmdd) return '-';
  const date = toValidDate(
    /^\d{4}-\d{2}-\d{2}$/.test(yyyymmdd) ? `${yyyymmdd}T12:00:00+05:30` : yyyymmdd
  );
  if (!date) return '-';
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
