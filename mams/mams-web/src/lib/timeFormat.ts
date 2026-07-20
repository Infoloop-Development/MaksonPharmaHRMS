import type { TimeFormat } from '@mams/types';

const IST = 'Asia/Kolkata';

export type { TimeFormat };

export const TIME_FORMAT_LABELS: Record<TimeFormat, string> = {
  '12h': '12-hour clock',
  '24h': '24-hour clock',
};

export const TIME_INPUT_HINTS: Record<TimeFormat, string> = {
  '24h': 'Please enter hours in 24-hour format (HH:mm)',
  '12h': 'Select time using hour, minute, and AM/PM',
};

export type Time12hParts = {
  hour12: number;
  minute: number;
  period: 'AM' | 'PM';
};

function hour12Options(): number[] {
  return Array.from({ length: 12 }, (_, i) => i + 1);
}

export { hour12Options };

export function splitHhmmTo12h(hhmm: string): Time12hParts | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim());
  if (!m) return null;
  const hour24 = Number(m[1]);
  const minute = Number(m[2]);
  const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { hour12, minute, period };
}

export function composeHhmmFrom12h(hour12: number, minute: number, period: 'AM' | 'PM'): string | null {
  if (hour12 < 1 || hour12 > 12 || minute < 0 || minute > 59) return null;
  let hour24 = hour12 % 12;
  if (period === 'PM') hour24 += 12;
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function formatInstant(date: Date, format: TimeFormat, withSeconds: boolean): string {
  const str = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
    hour12: format === '12h',
  }).format(date);
  return str.replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
}

export function formatIstInstant(d: Date | string | null, format: TimeFormat): string {
  if (!d) return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  return formatInstant(date, format, true);
}

export function formatIstInstantNoSeconds(d: Date | string | null, format: TimeFormat): string {
  if (!d) return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  const str = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    hour: 'numeric',
    minute: '2-digit',
    hour12: format === '12h',
  }).format(date);
  return str.replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
}

export function formatIstDateTimeMs(d: Date | string | null, format: TimeFormat): string {
  if (!d) return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  const base = formatInstant(date, format, true);
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  const periodMatch = /^(.*?)(\s(AM|PM))$/.exec(base);
  if (periodMatch) return `${periodMatch[1]}.${ms}${periodMatch[2]}`;
  return `${base}.${ms}`;
}

/** Format HH:mm clock string (shift windows, stored times). */
export function formatHhmm(hhmm: string | null | undefined, format: TimeFormat): string {
  if (!hhmm) return '-';
  const parts = splitHhmmTo12h(hhmm);
  if (!parts) return hhmm;
  if (format === '24h') return hhmm;
  const h = parts.hour12;
  const m = String(parts.minute).padStart(2, '0');
  return `${h}:${m} ${parts.period}`;
}

/** Format dashboard stamp HH:mm:ss for display. */
export function formatStampString(stamp: string | null | undefined, format: TimeFormat): string {
  if (stamp == null || stamp === '' || stamp === '-') return '-';
  const m = /^(\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?$/.exec(stamp);
  if (!m) return stamp;
  const hhmm = `${m[1]}:${m[2]}`;
  const secPart = m[3] ? `:${m[3]}` : '';

  if (format === '24h') {
    return `${m[1]}:${m[2]}${secPart}`;
  }

  const parts = splitHhmmTo12h(hhmm);
  if (!parts) return stamp;
  const h = parts.hour12;
  const min = String(parts.minute).padStart(2, '0');
  return `${h}:${min}${secPart} ${parts.period}`;
}

/** Format a shift window label like "06:00 – 18:00". */
export function formatShiftRange(start: string, end: string, format: TimeFormat): string {
  return `${formatHhmm(start, format)} – ${formatHhmm(end, format)}`;
}
