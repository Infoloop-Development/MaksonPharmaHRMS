import { fromZonedTime, toZonedTime, format as formatTz } from 'date-fns-tz';

const IST = 'Asia/Kolkata';

/**
 * Parse a 'YYYY-MM-DD HH:MM:SS' string assumed to be in IST,
 * returning a UTC Date object.
 */
export function istStringToUtc(istString: string): Date {
  // date-fns-tz fromZonedTime accepts an IST string + the zone, returns UTC.
  return fromZonedTime(istString.replace(' ', 'T'), IST);
}

/**
 * Convert a UTC Date to a 'YYYY-MM-DD' calendar date string in IST.
 * This is the canonical "rawDate" / "date" we use in DB records.
 */
export function utcToIstDateString(d: Date): string {
  const ist = toZonedTime(d, IST);
  return formatTz(ist, 'yyyy-MM-dd', { timeZone: IST });
}

/**
 * Format a UTC Date as 'HH:MM:SS' in IST.
 */
export function utcToIstTimeString(d: Date): string {
  const ist = toZonedTime(d, IST);
  return formatTz(ist, 'HH:mm:ss', { timeZone: IST });
}

/** Format UTC Date as 24h HH:mm:ss.SSS in IST (dashboard entry/exit stamps). */
export function utcToIstTimeHmsMsString(d: Date): string {
  const ist = toZonedTime(d, IST);
  const base = formatTz(ist, 'HH:mm:ss', { timeZone: IST });
  const ms = String(d.getUTCMilliseconds()).padStart(3, '0');
  return `${base}.${ms}`;
}
