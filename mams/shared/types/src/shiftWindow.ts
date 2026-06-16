import type { TimeShift } from './employee.js';

const IST = 'Asia/Kolkata';

export type ShiftWindowLike = {
  id: string;
  start: string;
  end: string;
  label?: string;
};

export function parseHHMMToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Minutes since midnight in IST for a UTC instant. */
export function istMinutesFromMidnight(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const m = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  return h * 60 + m;
}

/** True when `minutes` falls within [start, end) — supports overnight windows (end < start). */
export function isTimeWithinShiftWindow(minutes: number, start: string, end: string): boolean {
  const startM = parseHHMMToMinutes(start);
  const endM = parseHHMMToMinutes(end);
  if (startM <= endM) {
    return minutes >= startM && minutes < endM;
  }
  return minutes >= startM || minutes < endM;
}

export function findRealShiftWindow(
  timeShift: TimeShift,
  realShifts: ShiftWindowLike[] | null | undefined
): ShiftWindowLike | undefined {
  return realShifts?.find((s) => s.id === timeShift);
}

export function formatShiftWindowLabel(window: ShiftWindowLike): string {
  const name = window.label?.trim() || window.id;
  return `${name} (${window.start}–${window.end})`;
}

/** Returns true if outside shift, false if inside, null if shift config missing. */
export function isPunchOutsideRealShift(
  rawTimestamp: Date | string,
  timeShift: TimeShift,
  realShifts: ShiftWindowLike[] | null | undefined
): boolean | null {
  const window = findRealShiftWindow(timeShift, realShifts);
  if (!window) return null;
  const minutes = istMinutesFromMidnight(rawTimestamp);
  return !isTimeWithinShiftWindow(minutes, window.start, window.end);
}
