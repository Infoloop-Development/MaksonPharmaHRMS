/**
 * Realistic attendance punch times for seed scripts.
 * Uses employee timeShift and seeded PRNG — not a uniform day/night split.
 */
import { fromZonedTime } from 'date-fns-tz';
import type { Types } from 'mongoose';

const IST = 'Asia/Kolkata';

export const ABS_RATES = [0.09, 0.065, 0.055, 0.07, 0.11, 0.16, 0.22];
export const LATE_RATES = [0.15, 0.1, 0.09, 0.11, 0.14, 0.07, 0.05];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function addIstDays(date: string, delta: number): string {
  const base = new Date(`${date}T12:00:00+05:30`);
  const next = new Date(base.getTime() + delta * 24 * 60 * 60 * 1000);
  const y = next.getUTCFullYear();
  const m = pad(next.getUTCMonth() + 1);
  const d = pad(next.getUTCDate());
  return `${y}-${m}-${d}`;
}

function istDateTimeUtc(date: string, totalMinutes: number, r: () => number): { utc: Date; date: string } {
  const dayOffset = Math.floor(totalMinutes / (24 * 60));
  const mins = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const s = Math.floor(r() * 60);
  const istDate = addIstDays(date, dayOffset);
  const ist = `${istDate}T${pad(h)}:${pad(m)}:${pad(s)}`;
  return { utc: fromZonedTime(ist, IST), date: istDate };
}

/** Entry minutes from IST midnight for day or night shift with realistic spread. */
export function randomEntryMinutes(r: () => number, timeShift: 'Day' | 'Night'): number {
  const roll = r();
  if (timeShift === 'Day') {
    if (roll < 0.12) return 5 * 60 + 30 + Math.floor(r() * 75); // 05:30–06:44 early birds
    if (roll < 0.42) return 6 * 60 + 45 + Math.floor(r() * 75); // 06:45–07:59
    if (roll < 0.72) return 8 * 60 + Math.floor(r() * 75); // 08:00–09:14 on-time
    if (roll < 0.86) return 9 * 60 + 16 + Math.floor(r() * 44); // 09:16–09:59 late
    if (roll < 0.95) return 10 * 60 + Math.floor(r() * 90); // 10:00–11:29 very late
    return 11 * 60 + 30 + Math.floor(r() * 60); // 11:30–12:29 rare
  }
  if (roll < 0.1) return 17 * 60 + Math.floor(r() * 60); // 17:00–17:59 early
  if (roll < 0.45) return 18 * 60 + Math.floor(r() * 105); // 18:00–19:44
  if (roll < 0.72) return 19 * 60 + 45 + Math.floor(r() * 14); // 19:45–19:59 on-time
  if (roll < 0.88) return 20 * 60 + Math.floor(r() * 75); // 20:00–21:14 late
  return 21 * 60 + 15 + Math.floor(r() * 105); // 21:15–23:00 spread
}

/** Shift length in minutes — varied; some short (half-day) shifts. */
export function randomShiftMinutes(r: () => number): number {
  const roll = r();
  if (roll < 0.07) return 150 + Math.floor(r() * 90); // ~2.5–4h gross → half day
  if (roll < 0.18) return 270 + Math.floor(r() * 60); // ~4.5–5.5h
  if (roll < 0.55) return 480 + Math.floor(r() * 60); // 8–9h
  if (roll < 0.82) return 540 + Math.floor(r() * 60); // 9–10h
  return 600 + Math.floor(r() * 120); // 10–12h OT-ish
}

export type SeedPunchInput = {
  employeeId: Types.ObjectId;
  biometricId: string;
  empCode: string;
  timeShift: 'Day' | 'Night';
  date: string;
  weekdayIdx: number;
  receivedAt: Date;
  source: string;
  r: () => number;
};

export type SeedPunchRecord = Record<string, unknown>;

export function buildSeedPunchesForEmployee(input: SeedPunchInput): SeedPunchRecord[] | null {
  const { employeeId, biometricId, empCode, timeShift, date, weekdayIdx, receivedAt, source, r } =
    input;

  const isAbsent = r() < (ABS_RATES[weekdayIdx] ?? 0.1);
  if (isAbsent) return null;

  const entryMin = randomEntryMinutes(r, timeShift);
  const shiftMin = randomShiftMinutes(r);
  const exitMin = entryMin + shiftMin;

  const entry = istDateTimeUtc(date, entryMin, r);
  const exit = istDateTimeUtc(date, exitMin, r);

  return [
    {
      employeeId,
      biometricId,
      deviceId: null,
      punchType: 'IN',
      rawTimestamp: entry.utc,
      rawDate: entry.date,
      rawPayload: { source, empCode, timeShift },
      receivedAt,
      sourceIp: '127.0.0.1',
    },
    {
      employeeId,
      biometricId,
      deviceId: null,
      punchType: 'OUT',
      rawTimestamp: exit.utc,
      rawDate: exit.date,
      rawPayload: { source, empCode, timeShift },
      receivedAt,
      sourceIp: '127.0.0.1',
    },
  ];
}
