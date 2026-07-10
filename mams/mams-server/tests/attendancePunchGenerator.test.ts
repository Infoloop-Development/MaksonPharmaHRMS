import { describe, expect, it } from 'vitest';
import { seededRandom, hashString } from '../src/utils/prng.js';
import {
  buildSeedPunchesForEmployee,
  randomEntryMinutes,
  randomShiftMinutes,
} from '../seed/attendancePunchGenerator.js';
import { Types } from 'mongoose';

function seedForEmpDay(empCode: string, date: string): () => number {
  return seededRandom(hashString(`${empCode}:${date}`));
}

describe('attendancePunchGenerator', () => {
  it('spreads day shift entry times across early, on-time, and late', () => {
    const buckets = { early: 0, onTime: 0, late: 0 };
    for (let i = 0; i < 300; i++) {
      const empCode = `EMP${String(i).padStart(4, '0')}`;
      const r = seedForEmpDay(empCode, '2026-07-10');
      const m = randomEntryMinutes(r, 'Day');
      if (m < 8 * 60) buckets.early++;
      else if (m <= 9 * 60 + 14) buckets.onTime++;
      else buckets.late++;
    }
    expect(buckets.early).toBeGreaterThan(20);
    expect(buckets.onTime).toBeGreaterThan(40);
    expect(buckets.late).toBeGreaterThan(20);
  });

  it('spreads night shift entry times before and after 20:00', () => {
    const buckets = { before20: 0, atOrAfter20: 0 };
    for (let i = 0; i < 300; i++) {
      const empCode = `EMP${String(i).padStart(4, '0')}`;
      const r = seedForEmpDay(empCode, '2026-07-09');
      const m = randomEntryMinutes(r, 'Night');
      if (m < 20 * 60) buckets.before20++;
      else buckets.atOrAfter20++;
    }
    expect(buckets.before20).toBeGreaterThan(80);
    expect(buckets.atOrAfter20).toBeGreaterThan(20);
  });

  it('includes short shifts for half-day variety', () => {
    let short = 0;
    for (let i = 0; i < 400; i++) {
      const r = seedForEmpDay(`EMP${String(i).padStart(4, '0')}`, '2026-07-08');
      if (randomShiftMinutes(r) < 270) short++;
    }
    expect(short).toBeGreaterThan(15);
  });

  it('can place night shift OUT on next IST day when shift crosses midnight', () => {
    let crossed = false;
    for (let i = 0; i < 400; i++) {
      const empCode = `EMP${String(i).padStart(4, '0')}`;
      const r = seedForEmpDay(empCode, '2026-07-10');
      const punches = buildSeedPunchesForEmployee({
        employeeId: new Types.ObjectId(),
        biometricId: 'BIO001',
        empCode,
        timeShift: 'Night',
        date: '2026-07-10',
        weekdayIdx: 4,
        receivedAt: new Date(),
        source: 'test',
        r,
      });
      if (!punches) continue;
      const out = punches.find((p) => p.punchType === 'OUT');
      if (out?.rawDate === '2026-07-11') crossed = true;
    }
    expect(crossed).toBe(true);
  });
});
