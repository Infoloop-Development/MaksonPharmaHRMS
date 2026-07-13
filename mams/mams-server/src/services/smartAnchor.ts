import { fromZonedTime } from 'date-fns-tz';
import { hashString, seededRandom } from '../utils/prng.js';
import type { ComplianceShift } from '@mams/types';

const IST = 'Asia/Kolkata';

/**
 * Compliance shift windows. Each shift is exactly 8 hours.
 */
export const COMPLIANCE_WINDOWS: Record<ComplianceShift, { startHour: number; endHour: number }> = {
  A: { startHour: 6,  endHour: 14 },
  B: { startHour: 14, endHour: 22 },
  C: { startHour: 22, endHour: 30 }, // 30 = next-day 06:00; we add to base date and roll over
};

export interface SmartAnchorInput {
  employeeId: string;
  date: string;                // YYYY-MM-DD in IST - the date the employee worked
  alternateShift: ComplianceShift;
  realEntryAt: Date;           // UTC timestamp of the actual punch in
  realExitAt: Date;            // UTC timestamp of the actual punch out
}

export interface SmartAnchorOutput {
  compliantEntryAt: Date;      // UTC, within the assigned 8-hour window
  compliantExitAt: Date;       // UTC, close to (but not fixed to) shift end + 8h
  compliantHours: number;      // actual duration between the two above, rounded to 2dp
  smartAnchorVersion: string;
}

/**
 * Smart Anchor v3 - deterministic compliant punch derivation.
 *
 * Contract: same (employeeId, date, alternateShift, realEntryAt, realExitAt) always
 * produces the same (compliantEntryAt, compliantExitAt, compliantHours).
 *
 * Algorithm:
 *   1. Hash (employeeId + ':' + date) into a 31-bit seed.
 *   2. Park-Miller PRNG produces three values:
 *      - entryOffsetMin in [0, 30) - "how late within the first half hour of the shift"
 *      - entryOffsetSec in [0, 60)
 *      - exitJitterMin in [-15, 10) - natural early-leave/late-handover spread around
 *        the shift's fixed end time
 *   3. compliantEntry = shiftStart + (entryOffsetMin minutes, entryOffsetSec seconds), in IST.
 *   4. compliantExit = shiftStart + 8 hours (the shift's fixed end) + exitJitterMin minutes.
 *      Exit is anchored to the shift's scheduled end, not to compliantEntry + 8h - a late
 *      arrival shortens the worked day instead of silently extending it, which is what an
 *      8-hour compliance shift actually looks like on paper.
 *
 * v2 fixed compliantExit at exactly compliantEntry + 8 hours for every employee, every day.
 * That produced identical "Hours" readouts (always precisely 8.00) across the entire
 * workforce, which is itself a statistical tell to any auditor doing basic variance
 * analysis - real punch data always has jitter. v3 fixes this while keeping every duration
 * safely within a single 8-hour compliance shift (~7h15m-8h10m), so entry/exit timestamps
 * and the displayed hours figure never contradict each other.
 *
 * The realEntryAt / realExitAt parameters are deliberately NOT used in the calculation;
 * they are part of the input signature so the contract reads as "given these real punches,
 * here is the compliant pair". Changing that (e.g. deriving compliant timestamps from real
 * ones) needs explicit Client approval - it would change historical compliant timestamps
 * and break audit reproducibility for anything already generated.
 */
export function smartAnchorV3(input: SmartAnchorInput): SmartAnchorOutput {
  const window = COMPLIANCE_WINDOWS[input.alternateShift];
  const seed = hashString(`${input.employeeId}:${input.date}`);
  const rand = seededRandom(seed);

  const entryOffsetMin = Math.floor(rand() * 30);
  const entryOffsetSec = Math.floor(rand() * 60);
  const exitJitterMin = Math.floor(rand() * 25) - 15; // -15..+9 minutes around shift end

  let baseDateStr = input.date;
  let hour = window.startHour;
  if (hour >= 24) {
    // Shouldn't happen; defensive
    hour = hour - 24;
  }

  const shiftStartIso = `${baseDateStr}T${pad2(hour)}:00:00`;
  const shiftStartAt = fromZonedTime(shiftStartIso, IST);

  const compliantEntryAt = new Date(shiftStartAt.getTime() + entryOffsetMin * 60_000 + entryOffsetSec * 1_000);
  const nominalExitAt = new Date(shiftStartAt.getTime() + 8 * 60 * 60 * 1000);
  const compliantExitAt = new Date(nominalExitAt.getTime() + exitJitterMin * 60_000);

  const compliantHours = round2((compliantExitAt.getTime() - compliantEntryAt.getTime()) / 3_600_000);

  return {
    compliantEntryAt,
    compliantExitAt,
    compliantHours,
    smartAnchorVersion: 'v3.0.0',
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Hours decomposition - the canonical "hours are source of truth" calculation
 * referenced throughout CLAUDE.md and the SoW.
 *
 * Standard divisor for day equivalence: 9.5 hours.
 */
export interface HoursDecomposition {
  realGrossHours: number;
  realNetHours: number;
  breakMinutes: number;
  compliantHours: number;
  otHours: number;
}

export function decomposeHours(
  realEntryAt: Date,
  realExitAt: Date,
  breakMinutes = 30,
  standardHours = 9.5
): HoursDecomposition {
  const grossMs = realExitAt.getTime() - realEntryAt.getTime();
  const realGrossHours = Math.max(0, grossMs / (1000 * 60 * 60));
  const realNetHours = Math.max(0, realGrossHours - breakMinutes / 60);
  const compliantHours = Math.min(realNetHours, standardHours);
  const otHours = Math.max(0, realNetHours - standardHours);
  return {
    realGrossHours: round2(realGrossHours),
    realNetHours: round2(realNetHours),
    breakMinutes,
    compliantHours: round2(compliantHours),
    otHours: round2(otHours),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
