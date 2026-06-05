import { describe, it, expect } from 'vitest';
import {
  workDurationMinutes,
  workDurationMs,
  computeAutogeneration,
  computeAutogenerationBatch,
  addMinutes,
  addMilliseconds,
  formatDuration,
  formatDurationMs,
  parseTimeHmsMs,
  computeLateInMs,
  formatTimeHmsMs,
  normalizeTimeInput,
} from './shiftAutogeneration';

describe('parseTimeHmsMs', () => {
  it('parses HH:mm:ss.SSS', () => {
    expect(parseTimeHmsMs('09:00:00.000')).toBe(9 * 3600 * 1000);
    expect(parseTimeHmsMs('21:00:00.050')).toBe(21 * 3600 * 1000 + 50);
  });

  it('parses shorthand HH:mm', () => {
    expect(parseTimeHmsMs('09:00')).toBe(9 * 3600 * 1000);
  });

  it('normalizes to canonical form', () => {
    expect(normalizeTimeInput('9:00')).toBe('09:00:00.000');
  });
});

describe('workDurationMinutes', () => {
  it('same-day shift', () => {
    expect(workDurationMinutes('09:00', '17:00')).toBe(8 * 60);
    expect(workDurationMs('09:00:00.000', '17:00:00.000')).toBe(8 * 60 * 60 * 1000);
  });

  it('overnight shift', () => {
    expect(workDurationMinutes('21:00', '05:00')).toBe(8 * 60);
    expect(workDurationMs('21:00:00.000', '05:00:00.000')).toBe(8 * 60 * 60 * 1000);
  });
});

describe('addMinutes', () => {
  it('range start A plus 8 hours', () => {
    expect(addMinutes('06:50', 8 * 60)).toEqual({ time: '14:50:00.000', nextDay: false });
  });
});

describe('addMilliseconds', () => {
  it('preserves ms offset', () => {
    const r = addMilliseconds('06:50:00.123', 8 * 60 * 60 * 1000);
    expect(r?.time).toBe('14:50:00.123');
  });
});

describe('computeAutogeneration', () => {
  const base = {
    clockIn: '21:00:00.000',
    clockOut: '05:00:00.000',
    lastAllowedLogin: '07:00:00.000',
    bufferStart: '06:50:00.000',
    bufferEnd: '07:30:00.000',
  };

  it('single generation: alternate out = A + (Y - X)', () => {
    const r = computeAutogeneration({
      ...base,
      clockIn: '09:00:00.000',
      clockOut: '17:00:00.000',
      lastAllowedLogin: '09:00:00.000',
    });
    expect(r.durationMs).toBe(8 * 60 * 60 * 1000);
    expect(r.generated?.alternateClockIn).toBe('06:50:00.000');
    expect(r.generated?.alternateClockOut).toBe('14:50:00.000');
    expect(Object.keys(r.errors)).toHaveLength(0);
  });

  it('late on X propagates to B + same late; out = in + (Y - X)', () => {
    const r = computeAutogeneration({
      clockIn: '07:20:00.000',
      clockOut: '15:20:00.000',
      lastAllowedLogin: '07:00:00.000',
      bufferStart: '06:50:00.000',
      bufferEnd: '07:30:00.000',
    });
    expect(computeLateInMs('07:20:00.000', '07:00:00.000')).toBe(20 * 60 * 1000);
    expect(r.lateInLabel).toBe('Late in by 20 min');
    expect(r.generated?.alternateClockIn).toBe('07:50:00.000');
    expect(r.generated?.alternateClockOut).toBe('15:50:00.000');
    expect(r.generated?.lateInLabel).toBe('Late in by 20 min');
  });

  it('night main late matches alternate late vs B (screenshot scenario)', () => {
    const r = computeAutogeneration({
      clockIn: '21:34:32.234',
      clockOut: '06:21:22.121',
      lastAllowedLogin: '21:30:00.000',
      bufferStart: '06:50:00.000',
      bufferEnd: '07:30:00.000',
    });
    const lateMs = 4 * 60 * 1000 + 32 * 1000 + 234;
    expect(r.mainLateInMs).toBe(lateMs);
    expect(r.generated?.alternateClockIn).toBe('07:34:32.234');
    expect(r.generated?.lateInLabel).toBe('Late in by 4 min 32.234 sec');
    expect(r.generated?.onTimeLabel).toBeNull();
  });

  it('alternate before last allowed is on time not late', () => {
    const r = computeAutogeneration({
      clockIn: '06:51:04.252',
      clockOut: '14:51:04.252',
      lastAllowedLogin: '07:30:00.000',
      bufferStart: '06:50:00.000',
      bufferEnd: '07:30:00.000',
    });
    expect(r.generated?.alternateClockIn).toBe('06:50:00.000');
    expect(r.generated?.lateInLabel).toBeNull();
    expect(r.generated?.onTimeLabel).toContain('On time');
  });

  it('warns when generated alternate in outside A–B', () => {
    const r = computeAutogeneration({
      clockIn: '07:20:00.000',
      clockOut: '15:20:00.000',
      lastAllowedLogin: '07:00:00.000',
      bufferStart: '06:50:00.000',
      bufferEnd: '07:05:00.000',
    });
    expect(r.generated?.alternateClockIn).toBe('07:25:00.000');
    expect(r.generated?.withinRange).toBe(false);
    expect(r.errors.general).toContain('outside range');
  });

  it('rejects B before A', () => {
    const r = computeAutogeneration({
      clockIn: '09:00:00.000',
      clockOut: '17:00:00.000',
      lastAllowedLogin: '08:00:00.000',
      bufferStart: '07:30:00.000',
      bufferEnd: '06:50:00.000',
    });
    expect(r.errors.bufferEnd).toBeDefined();
    expect(r.generated).toBeNull();
  });

  it('rejects clock out before clock in on same day', () => {
    const r = computeAutogeneration({
      clockIn: '10:00:00.000',
      clockOut: '09:00:00.000',
      lastAllowedLogin: '08:00:00.000',
      bufferStart: '06:50:00.000',
      bufferEnd: '07:30:00.000',
    });
    expect(r.errors.clockOut).toBeDefined();
    expect(r.durationMs).toBeNull();
  });

  it('requires last allowed login', () => {
    const r = computeAutogeneration({
      clockIn: '09:00:00.000',
      clockOut: '17:00:00.000',
      lastAllowedLogin: '',
      bufferStart: '06:50:00.000',
      bufferEnd: '07:30:00.000',
    });
    expect(r.errors.lastAllowedLogin).toBeDefined();
  });
});

describe('computeAutogenerationBatch', () => {
  const shared = {
    lastAllowedLogin: '21:01:00.000',
    bufferStart: '06:50:00.000',
    bufferEnd: '07:30:00.000',
  };

  it('preserves 50ms main gap on alternate ins when on-time at A', () => {
    const r = computeAutogenerationBatch(
      [
        { id: 'A', clockIn: '21:00:00.000', clockOut: '05:00:00.000' },
        { id: 'B', clockIn: '21:00:00.050', clockOut: '05:00:00.050' },
      ],
      shared
    );
    expect(r.spacingOk).toBe(true);
    expect(r.uniquenessOk).toBe(true);
    const a = r.employees.find((e) => e.id === 'A')?.generated;
    const b = r.employees.find((e) => e.id === 'B')?.generated;
    expect(a?.alternateClockIn).toBe('06:50:00.000');
    expect(b?.alternateClockIn).toBe('06:50:00.050');
    expect(parseTimeHmsMs(b!.alternateClockIn)! - parseTimeHmsMs(a!.alternateClockIn)!).toBe(50);
  });

  it('preserves 50ms late gap when both late (B + late)', () => {
    const r = computeAutogenerationBatch(
      [
        { id: 'A', clockIn: '21:00:00.050', clockOut: '05:00:00.050' },
        { id: 'B', clockIn: '21:00:00.100', clockOut: '05:00:00.100' },
      ],
      { ...shared, lastAllowedLogin: '21:00:00.000' }
    );
    const a = r.employees.find((e) => e.id === 'A')?.generated;
    const b = r.employees.find((e) => e.id === 'B')?.generated;
    expect(a?.alternateClockIn).toBe('07:30:00.050');
    expect(b?.alternateClockIn).toBe('07:30:00.100');
    expect(r.spacingOk).toBe(true);
  });

  it('bumps identical main clock-in by 1ms on alternate in', () => {
    const r = computeAutogenerationBatch(
      [
        { id: 'A', clockIn: '21:00:00.000', clockOut: '05:00:00.000' },
        { id: 'B', clockIn: '21:00:00.000', clockOut: '05:00:00.000' },
      ],
      { ...shared, lastAllowedLogin: '21:01:00.000' }
    );
    expect(r.uniquenessOk).toBe(true);
    const a = r.employees.find((e) => e.id === 'A')?.generated;
    const b = r.employees.find((e) => e.id === 'B')?.generated;
    expect(a?.alternateClockIn).toBe('06:50:00.000');
    expect(b?.alternateClockIn).toBe('06:50:00.001');
  });
});

describe('formatDuration', () => {
  it('formats 8 hours', () => {
    expect(formatDuration(480)).toBe('8 hours 0 minutes');
    expect(formatDurationMs(8 * 60 * 60 * 1000)).toBe('8 hours 0 minutes');
  });
});

describe('formatTimeHmsMs', () => {
  it('formats with ms', () => {
    expect(formatTimeHmsMs(21 * 3600 * 1000 + 50)).toBe('21:00:00.050');
  });
});
