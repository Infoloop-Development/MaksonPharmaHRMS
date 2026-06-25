import { utcToIstDateString } from '../src/utils/time.js';

export type SeedDay = {
  date: string;
  weekdayIdx: number;
};

/** Monday = 0 … Sunday = 6 — matches ABS_RATES index in seed.ts */
export function dayIdxFromDateString(date: string): number {
  const d = new Date(`${date}T12:00:00+05:30`);
  const day = d.getUTCDay();
  return day === 0 ? 6 : day - 1;
}

function addIstDays(date: string, delta: number): string {
  const base = new Date(`${date}T12:00:00+05:30`);
  return utcToIstDateString(new Date(base.getTime() + delta * 24 * 60 * 60 * 1000));
}

function buildDayRange(startDate: string, endDate: string): SeedDay[] {
  const days: SeedDay[] = [];
  let cursor = startDate;
  while (cursor <= endDate) {
    days.push({ date: cursor, weekdayIdx: dayIdxFromDateString(cursor) });
    cursor = addIstDays(cursor, 1);
  }
  return days;
}

/** Last N IST calendar days ending today (inclusive). */
export function buildLastNSeedDays(dayCount: number, now: Date = new Date()): SeedDay[] {
  const n = Math.max(1, Math.floor(dayCount));
  const end = utcToIstDateString(now);
  const start = addIstDays(end, -(n - 1));
  return buildDayRange(start, end);
}

/** Last 7 IST days through today, plus tomorrow (8 days total). */
export function buildRollingSeedDays(now: Date = new Date()): SeedDay[] {
  const days: SeedDay[] = [];
  for (const i of [6, 5, 4, 3, 2, 1, 0, -1]) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const date = utcToIstDateString(d);
    days.push({ date, weekdayIdx: dayIdxFromDateString(date) });
  }
  return days;
}

/** Anchor − 6 through anchor + 1 (8 days). */
export function buildAnchorSeedDays(anchorDate: string): SeedDay[] {
  const start = addIstDays(anchorDate, -6);
  const end = addIstDays(anchorDate, 1);
  return buildDayRange(start, end);
}

export function mergeSeedDays(...ranges: SeedDay[][]): SeedDay[] {
  const byDate = new Map<string, SeedDay>();
  for (const range of ranges) {
    for (const day of range) {
      byDate.set(day.date, day);
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function resolveDemoAnchorDate(now: Date = new Date()): string {
  const fromEnv = process.env.SEED_DEMO_ANCHOR_DATE?.trim();
  if (fromEnv && /^\d{4}-\d{2}-\d{2}$/.test(fromEnv)) return fromEnv;
  return utcToIstDateString(now);
}

/** Rolling window plus anchor window when anchor differs from today. */
export function buildMergedSeedDays(now: Date = new Date()): {
  days: SeedDay[];
  anchorDate: string;
  rollingDays: SeedDay[];
  anchorDays: SeedDay[];
} {
  const anchorDate = resolveDemoAnchorDate(now);
  const rollingDays = buildRollingSeedDays(now);
  const today = utcToIstDateString(now);
  const anchorDays = buildAnchorSeedDays(anchorDate);
  const days =
    anchorDate === today
      ? rollingDays
      : mergeSeedDays(rollingDays, anchorDays);
  return { days, anchorDate, rollingDays, anchorDays };
}

/** Days used for bar-chart demo alignment (excludes tomorrow if present). */
export function barChartSeedDays(allDays: SeedDay[], now: Date = new Date()): SeedDay[] {
  const tomorrow = utcToIstDateString(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  return allDays.filter((d) => d.date !== tomorrow);
}
