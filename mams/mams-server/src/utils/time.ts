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

/** Start of an IST calendar day (inclusive) as UTC. */
export function istDateStartUtc(dateStr: string): Date {
  return fromZonedTime(`${dateStr}T00:00:00.000`, IST);
}

/** End of an IST calendar day (inclusive) as UTC. */
export function istDateEndUtc(dateStr: string): Date {
  return fromZonedTime(`${dateStr}T23:59:59.999`, IST);
}

/**
 * Noon of an IST calendar day, as UTC. Used as the cutover point between a Night
 * shift's previous-evening start and next-morning end - neither Day shift (6AM-6PM)
 * nor Night shift (6PM-6AM) ever has real activity anywhere near noon, so it's a safe
 * boundary for splitting the timeline into one bucket per shift day.
 */
export function istNoonUtc(dateStr: string): Date {
  return fromZonedTime(`${dateStr}T12:00:00.000`, IST);
}

/** Add (or subtract) whole days to an IST calendar date string. India has no DST. */
export function addIstCalendarDays(dateStr: string, days: number): string {
  const shifted = new Date(istNoonUtc(dateStr).getTime() + days * 24 * 60 * 60 * 1000);
  return utcToIstDateString(shifted);
}
