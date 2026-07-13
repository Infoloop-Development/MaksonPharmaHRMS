import { describe, it, expect } from 'vitest';
import { shiftDayFor } from '../src/services/attendance.service.js';

describe('shiftDayFor', () => {
  it('Day shift always matches its own calendar date, any time of day', () => {
    expect(shiftDayFor('Day', new Date('2026-07-11T00:30:00.000Z'))).toBe('2026-07-11'); // 06:00 IST
    expect(shiftDayFor('Day', new Date('2026-07-11T12:30:00.000Z'))).toBe('2026-07-11'); // 18:00 IST
  });

  it('Night shift punch before noon IST belongs to the previous calendar day', () => {
    // 2026-07-12T05:04:58Z = 2026-07-12 10:34:58 IST - early morning clock-out.
    expect(shiftDayFor('Night', new Date('2026-07-12T05:04:58.000Z'))).toBe('2026-07-11');
  });

  it('Night shift punch at/after noon IST belongs to its own calendar day', () => {
    // 2026-07-11T17:18:07Z = 2026-07-11 22:48:07 IST - evening clock-in.
    expect(shiftDayFor('Night', new Date('2026-07-11T17:18:07.000Z'))).toBe('2026-07-11');
  });

  it('Night shift clock-in and clock-out from the same real shift resolve to the same shift day', () => {
    const clockIn = new Date('2026-07-11T17:18:07.000Z'); // evening of the 11th
    const clockOut = new Date('2026-07-12T05:04:58.000Z'); // early morning of the 12th
    expect(shiftDayFor('Night', clockIn)).toBe(shiftDayFor('Night', clockOut));
  });
});
