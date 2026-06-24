import {
  addMsFromAnchor,
  formatTimeHmsMs,
  parseTimeHmsMs,
  type AlternateShift,
} from './shiftAutogeneration';

export const BASELINE_WORKING_DAYS = 26;
export const BASELINE_HOURS = BASELINE_WORKING_DAYS * 8; // 208

const MIN_WORK_MS = (7 * 60 + 50) * 60 * 1000;
const MAX_WORK_MS = (8 * 60 + 10) * 60 * 1000;
const EXACT_8H_MS = 8 * 60 * 60 * 1000;

export type DayStatus = 'present' | 'leave' | 'weeklyOff' | 'empty' | 'unassigned';

/** Canonical punch time display (HH:mm:ss). */
export type PunchTimeString = string;

export interface MonthlyPlanDay {
  date: string;
  weekday: string;
  dayOfMonth: number;
  inMonth: boolean;
  status: DayStatus;
  /** Person assigned / involved on this day (present days only). */
  involvedPerson: string | null;
  checkIn: PunchTimeString | null;
  checkOut: PunchTimeString | null;
  checkOutNextDay: boolean;
  /** Worked hours as decimal number. */
  hoursWorked: number | null;
  /** Worked hours formatted for display (e.g. "7.92 h"). */
  hoursWorkedFormatted: string | null;
  /** @deprecated Use checkIn */
  clockIn: PunchTimeString | null;
  /** @deprecated Use checkOut */
  clockOut: PunchTimeString | null;
  /** @deprecated Use checkOutNextDay */
  clockOutNextDay: boolean;
}

export interface MonthlyPlanSummary {
  yearMonth: string;
  realHours: number;
  baselineHours: number;
  baselineDays: number;
  presentDays: number;
  leaveDays: number;
  extraCashHours: number;
  deductedHours: number;
  eligibleWeekdays: number;
  calendarCapped: boolean;
  calendarPresentDays: number;
  calendarLeaveDays: number;
}

export interface MonthlyPlanResult {
  summary: MonthlyPlanSummary;
  days: MonthlyPlanDay[];
  calendarWeeks: MonthlyPlanDay[][];
}

export interface MonthlyPlanInput {
  yearMonth: string;
  shift: AlternateShift;
  bufferStart: string;
  bufferEnd: string;
  realHours: number;
  /** Comma-separated names rotated across present days (e.g. "Ravi, Priya"). */
  involvedPersonnel?: string;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

function formatTimeHms(msSinceMidnight: number): string {
  return formatTimeHmsMs(msSinceMidnight).slice(0, 8);
}

function formatHoursDecimal(totalMs: number): string {
  const hours = totalMs / (60 * 60 * 1000);
  return `${hours.toFixed(2)} h`;
}

function parseYearMonth(yearMonth: string): { year: number; month: number } | null {
  const m = yearMonth.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = parseInt(m[1]!, 10);
  const month = parseInt(m[2]!, 10);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

function dateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function listEligibleWeekdays(year: number, month: number): string[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const out: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0) out.push(dateString(year, month, d));
  }
  return out;
}

function parseInvolvedPersonnel(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
}

function assignInvolvedPerson(date: string, yearMonth: string, personnel: string[]): string | null {
  if (personnel.length === 0) return null;
  const idx = hashString(`${yearMonth}:${date}:person`) % personnel.length;
  return personnel[idx] ?? null;
}

function dayPunchFields(
  punches: Pick<MonthlyPlanDay, 'checkIn' | 'checkOut' | 'checkOutNextDay' | 'hoursWorked' | 'hoursWorkedFormatted'>
): Pick<
  MonthlyPlanDay,
  | 'checkIn'
  | 'checkOut'
  | 'checkOutNextDay'
  | 'hoursWorked'
  | 'hoursWorkedFormatted'
  | 'clockIn'
  | 'clockOut'
  | 'clockOutNextDay'
> {
  return {
    ...punches,
    clockIn: punches.checkIn,
    clockOut: punches.checkOut,
    clockOutNextDay: punches.checkOutNextDay,
  };
}

function shuffleSeeded<T>(items: T[], seedKey: string): T[] {
  const rand = seededRandom(hashString(seedKey));
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function randomClockInMs(date: string, yearMonth: string, bufferStartMs: number, bufferEndMs: number): number {
  const rand = seededRandom(hashString(`${yearMonth}:${date}:in`));
  if (bufferEndMs <= bufferStartMs) return bufferStartMs;
  return Math.floor(bufferStartMs + rand() * (bufferEndMs - bufferStartMs));
}

function randomWorkDurationMs(date: string, yearMonth: string): number {
  const rand = seededRandom(hashString(`${yearMonth}:${date}:dur`));
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

function generatePunches(
  date: string,
  yearMonth: string,
  bufferStartMs: number,
  bufferEndMs: number
): Pick<MonthlyPlanDay, 'checkIn' | 'checkOut' | 'checkOutNextDay' | 'hoursWorked' | 'hoursWorkedFormatted'> {
  const inMs = randomClockInMs(date, yearMonth, bufferStartMs, bufferEndMs);
  const durationMs = randomWorkDurationMs(date, yearMonth);
  const out = addMsFromAnchor(inMs, durationMs);
  return {
    checkIn: formatTimeHms(inMs),
    checkOut: formatTimeHms(out.ms),
    checkOutNextDay: out.nextDay,
    hoursWorked: durationMs / (60 * 60 * 1000),
    hoursWorkedFormatted: formatHoursDecimal(durationMs),
  };
}

function blankDay(
  partial: Pick<MonthlyPlanDay, 'date' | 'weekday' | 'dayOfMonth' | 'inMonth' | 'status'> &
    Partial<Pick<MonthlyPlanDay, 'involvedPerson'>> &
    Partial<Pick<MonthlyPlanDay, 'checkIn' | 'checkOut' | 'checkOutNextDay' | 'hoursWorked' | 'hoursWorkedFormatted'>>
): MonthlyPlanDay {
  const punches =
    partial.checkIn != null
      ? {
          checkIn: partial.checkIn,
          checkOut: partial.checkOut ?? null,
          checkOutNextDay: partial.checkOutNextDay ?? false,
          hoursWorked: partial.hoursWorked ?? null,
          hoursWorkedFormatted: partial.hoursWorkedFormatted ?? null,
        }
      : {
          checkIn: null,
          checkOut: null,
          checkOutNextDay: false,
          hoursWorked: null,
          hoursWorkedFormatted: null,
        };
  return {
    date: partial.date,
    weekday: partial.weekday,
    dayOfMonth: partial.dayOfMonth,
    inMonth: partial.inMonth,
    status: partial.status,
    involvedPerson: partial.involvedPerson ?? null,
    ...dayPunchFields(punches),
  };
}

/** Display label for check-out time including next-day marker. */
export function formatCheckOutLabel(checkOut: string, nextDay: boolean): string {
  return `${checkOut}${nextDay ? ' (+1 day)' : ''}`;
}

function buildCalendarWeeks(year: number, month: number, dayByDate: Map<string, MonthlyPlanDay>): MonthlyPlanDay[][] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay();
  const weeks: MonthlyPlanDay[][] = [];
  let week: MonthlyPlanDay[] = [];

  for (let i = 0; i < firstDow; i++) {
    week.push(
      blankDay({
        date: '',
        weekday: WEEKDAY_LABELS[i] ?? '',
        dayOfMonth: 0,
        inMonth: false,
        status: 'empty',
      })
    );
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const ds = dateString(year, month, d);
    const dow = new Date(year, month - 1, d).getDay();
    week.push(
      dayByDate.get(ds) ??
        blankDay({
          date: ds,
          weekday: WEEKDAY_LABELS[dow] ?? '',
          dayOfMonth: d,
          inMonth: true,
          status: 'unassigned',
        })
    );
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }

  if (week.length > 0) {
    while (week.length < 7) {
      week.push(
        blankDay({
          date: '',
          weekday: WEEKDAY_LABELS[week.length] ?? '',
          dayOfMonth: 0,
          inMonth: false,
          status: 'empty',
        })
      );
    }
    weeks.push(week);
  }

  return weeks;
}

export function computeMonthlyPlan(input: MonthlyPlanInput): MonthlyPlanResult | { error: string } {
  const parsed = parseYearMonth(input.yearMonth);
  if (!parsed) return { error: 'Invalid month (use YYYY-MM)' };

  const bufferStartMs = parseTimeHmsMs(input.bufferStart);
  const bufferEndMs = parseTimeHmsMs(input.bufferEnd);
  if (bufferStartMs === null || bufferEndMs === null) {
    return { error: 'Invalid buffer start or end time' };
  }
  if (bufferEndMs <= bufferStartMs) {
    return { error: 'Buffer end must be after buffer start' };
  }

  const realHours = Number(input.realHours);
  if (!Number.isFinite(realHours) || realHours < 0) {
    return { error: 'Real hours must be a non-negative number' };
  }

  const { year, month } = parsed;
  const daysInMonth = new Date(year, month, 0).getDate();
  const eligibleWeekdays = listEligibleWeekdays(year, month);

  let presentDays = BASELINE_WORKING_DAYS;
  let leaveDays = 0;
  let extraCashHours = 0;
  let deductedHours = 0;

  if (realHours > BASELINE_HOURS) {
    presentDays = BASELINE_WORKING_DAYS;
    extraCashHours = realHours - BASELINE_HOURS;
  } else if (realHours < BASELINE_HOURS) {
    deductedHours = BASELINE_HOURS - realHours;
    leaveDays = Math.ceil(deductedHours / 8);
    presentDays = BASELINE_WORKING_DAYS - leaveDays;
  }

  const calendarLeaveDays = Math.min(leaveDays, eligibleWeekdays.length);
  const calendarPresentDays = Math.min(
    presentDays,
    Math.max(0, eligibleWeekdays.length - calendarLeaveDays)
  );
  const calendarCapped =
    eligibleWeekdays.length < BASELINE_WORKING_DAYS ||
    calendarPresentDays + calendarLeaveDays < presentDays + leaveDays;

  const shuffled = shuffleSeeded(eligibleWeekdays, `${input.yearMonth}:leave`);
  const leaveSet = new Set(shuffled.slice(0, calendarLeaveDays));
  const presentSet = new Set(
    shuffled.filter((d) => !leaveSet.has(d)).slice(0, calendarPresentDays)
  );

  const personnel = parseInvolvedPersonnel(input.involvedPersonnel);

  const dayByDate = new Map<string, MonthlyPlanDay>();

  for (let d = 1; d <= daysInMonth; d++) {
    const ds = dateString(year, month, d);
    const dow = new Date(year, month - 1, d).getDay();
    const weekday = WEEKDAY_LABELS[dow] ?? '';

    if (dow === 0) {
      dayByDate.set(
        ds,
        blankDay({
          date: ds,
          weekday,
          dayOfMonth: d,
          inMonth: true,
          status: 'weeklyOff',
        })
      );
      continue;
    }

    if (leaveSet.has(ds)) {
      dayByDate.set(
        ds,
        blankDay({
          date: ds,
          weekday,
          dayOfMonth: d,
          inMonth: true,
          status: 'leave',
        })
      );
      continue;
    }

    if (presentSet.has(ds)) {
      const punches = generatePunches(ds, input.yearMonth, bufferStartMs, bufferEndMs);
      dayByDate.set(
        ds,
        blankDay({
          date: ds,
          weekday,
          dayOfMonth: d,
          inMonth: true,
          status: 'present',
          involvedPerson: assignInvolvedPerson(ds, input.yearMonth, personnel),
          ...punches,
        })
      );
      continue;
    }

    dayByDate.set(
      ds,
      blankDay({
        date: ds,
        weekday,
        dayOfMonth: d,
        inMonth: true,
        status: 'unassigned',
      })
    );
  }

  const days = [...dayByDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  const calendarWeeks = buildCalendarWeeks(year, month, dayByDate);

  return {
    summary: {
      yearMonth: input.yearMonth,
      realHours,
      baselineHours: BASELINE_HOURS,
      baselineDays: BASELINE_WORKING_DAYS,
      presentDays,
      leaveDays,
      extraCashHours,
      deductedHours,
      eligibleWeekdays: eligibleWeekdays.length,
      calendarCapped,
      calendarPresentDays,
      calendarLeaveDays,
    },
    days,
    calendarWeeks,
  };
}

/** For tests: ms since midnight for clock-in on a given date. */
export function clockInMsForTest(
  date: string,
  yearMonth: string,
  bufferStartMs: number,
  bufferEndMs: number
): number {
  return randomClockInMs(date, yearMonth, bufferStartMs, bufferEndMs);
}

export function workDurationMsForTest(date: string, yearMonth: string): number {
  return randomWorkDurationMs(date, yearMonth);
}
