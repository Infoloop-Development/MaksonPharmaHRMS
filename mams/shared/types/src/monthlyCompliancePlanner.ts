import type { ComplianceShift } from './employee.js';
import {
  formatTimeHmsMs,
  generateDailyCompliancePunches,
  parseTimeHmsMs,
} from './complianceDailyGenerator.js';

export const BASELINE_WORKING_DAYS = 26;
export const BASELINE_HOURS = BASELINE_WORKING_DAYS * 8;

export type DayStatus = 'present' | 'leave' | 'weeklyOff' | 'empty' | 'unassigned';

export type PunchTimeString = string;

export interface MonthlyPlanDay {
  date: string;
  weekday: string;
  dayOfMonth: number;
  inMonth: boolean;
  status: DayStatus;
  involvedPerson: string | null;
  checkIn: PunchTimeString | null;
  checkOut: PunchTimeString | null;
  checkOutNextDay: boolean;
  hoursWorked: number | null;
  hoursWorkedFormatted: string | null;
  clockIn: PunchTimeString | null;
  clockOut: PunchTimeString | null;
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
  shift: ComplianceShift;
  bufferStart: string;
  bufferEnd: string;
  realHours: number;
  involvedPersonnel?: string;
  /** Per-employee seed namespace (defaults to yearMonth). */
  seedNamespace?: string;
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

function assignInvolvedPerson(date: string, seedNs: string, personnel: string[]): string | null {
  if (personnel.length === 0) return null;
  const idx = hashString(`${seedNs}:${date}:person`) % personnel.length;
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

function generatePunches(
  date: string,
  seedNs: string,
  bufferStartMs: number,
  bufferEndMs: number,
  shift: ComplianceShift
): Pick<MonthlyPlanDay, 'checkIn' | 'checkOut' | 'checkOutNextDay' | 'hoursWorked' | 'hoursWorkedFormatted'> {
  const bufferStart = formatTimeHmsMs(bufferStartMs).slice(0, 8);
  const bufferEnd = formatTimeHmsMs(bufferEndMs).slice(0, 8);
  const punches = generateDailyCompliancePunches({
    seedBase: `${seedNs}:${date}`,
    alternateShift: shift,
    bufferStart,
    bufferEnd,
  });
  return {
    checkIn: punches.checkIn,
    checkOut: punches.checkOut,
    checkOutNextDay: punches.checkOutNextDay,
    hoursWorked: punches.hoursWorked,
    hoursWorkedFormatted: punches.hoursWorkedFormatted,
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

export function dayStatusExportLabel(status: DayStatus): string {
  switch (status) {
    case 'present':
      return 'Present';
    case 'leave':
      return 'Leave';
    case 'weeklyOff':
      return 'Weekly Off';
    default:
      return '—';
  }
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
    return { error: 'Hours must be a non-negative number' };
  }

  const seedNs = input.seedNamespace?.trim() || input.yearMonth;
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

  const shuffled = shuffleSeeded(eligibleWeekdays, `${seedNs}:leave`);
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
      const punches = generatePunches(ds, seedNs, bufferStartMs, bufferEndMs, input.shift);
      dayByDate.set(
        ds,
        blankDay({
          date: ds,
          weekday,
          dayOfMonth: d,
          inMonth: true,
          status: 'present',
          involvedPerson: assignInvolvedPerson(ds, seedNs, personnel),
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

export function clockInMsForTest(
  date: string,
  seedNs: string,
  bufferStartMs: number,
  bufferEndMs: number,
  shift: ComplianceShift = 'A'
): number {
  const bufferStart = formatTimeHmsMs(bufferStartMs).slice(0, 8);
  const bufferEnd = formatTimeHmsMs(bufferEndMs).slice(0, 8);
  const punches = generateDailyCompliancePunches({
    seedBase: `${seedNs}:${date}`,
    alternateShift: shift,
    bufferStart,
    bufferEnd,
  });
  return parseTimeHmsMs(punches.checkIn)!;
}

export function workDurationMsForTest(date: string, seedNs: string, shift: ComplianceShift = 'A'): number {
  const punches = generateDailyCompliancePunches({
    seedBase: `${seedNs}:${date}`,
    alternateShift: shift,
  });
  return punches.hoursWorked * 60 * 60 * 1000;
}
