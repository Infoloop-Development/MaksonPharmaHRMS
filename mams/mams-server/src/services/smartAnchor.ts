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
  compliantExitAt: Date;       // UTC, exactly 8 hours after compliantEntryAt
  smartAnchorVersion: string;
}

/**
 * Smart Anchor v2 - deterministic compliant punch derivation.
 *
 * Contract: same (employeeId, date, alternateShift, realEntryAt, realExitAt) always
 * produces the same (compliantEntryAt, compliantExitAt).
 *
 * Algorithm:
 *   1. Hash (employeeId + ':' + date) into a 31-bit seed.
 *   2. Park-Miller PRNG produces two values:
 *      - entryOffsetMin in [0, 30) - "how late within the first half hour of the shift"
 *      - entryOffsetSec in [0, 60)
 *   3. compliantEntry = shiftStart + (entryOffsetMin minutes, entryOffsetSec seconds), in IST.
 *   4. compliantExit = compliantEntry + 8 hours.
 *
 * The realEntryAt / realExitAt parameters are deliberately NOT used in the calculation;
 * they are part of the input signature so the contract reads as "given these real punches,
 * here is the compliant pair". If you want to deviate (e.g., compliant entry should be
 * later if real entry was very late), do it in v3 with explicit Client approval - changing
 * the algorithm changes historical compliant timestamps and breaks audit reproducibility.
 */
export function smartAnchorV2(input: SmartAnchorInput): SmartAnchorOutput {
  const window = COMPLIANCE_WINDOWS[input.alternateShift];
  const seed = hashString(`${input.employeeId}:${input.date}`);
  const rand = seededRandom(seed);

  const entryOffsetMin = Math.floor(rand() * 30);
  const entryOffsetSec = Math.floor(rand() * 60);

  // Build IST datetime string: 'YYYY-MM-DDTHH:MM:SS'
  let baseDateStr = input.date;
  let hour = window.startHour;
  if (hour >= 24) {
    // Shouldn't happen; defensive
    hour = hour - 24;
  }

  const istIso = `${baseDateStr}T${pad2(hour)}:${pad2(entryOffsetMin)}:${pad2(entryOffsetSec)}`;
  let compliantEntryAt = fromZonedTime(istIso, IST);
  let compliantExitAt = new Date(compliantEntryAt.getTime() + 8 * 60 * 60 * 1000);

  return {
    compliantEntryAt,
    compliantExitAt,
    smartAnchorVersion: 'v2.0.0',
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
