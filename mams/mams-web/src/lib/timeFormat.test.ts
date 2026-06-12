import { describe, expect, it } from 'vitest';
import {
  composeHhmmFrom12h,
  formatHhmm,
  formatStampString,
  splitHhmmTo12h,
} from './timeFormat';

describe('splitHhmmTo12h / composeHhmmFrom12h', () => {
  it('round-trips morning times', () => {
    expect(splitHhmmTo12h('09:00')).toEqual({ hour12: 9, minute: 0, period: 'AM' });
    expect(composeHhmmFrom12h(9, 0, 'AM')).toBe('09:00');
  });

  it('round-trips evening times', () => {
    expect(splitHhmmTo12h('21:30')).toEqual({ hour12: 9, minute: 30, period: 'PM' });
    expect(composeHhmmFrom12h(9, 30, 'PM')).toBe('21:30');
  });

  it('handles noon and midnight', () => {
    expect(splitHhmmTo12h('12:00')).toEqual({ hour12: 12, minute: 0, period: 'PM' });
    expect(splitHhmmTo12h('00:00')).toEqual({ hour12: 12, minute: 0, period: 'AM' });
    expect(composeHhmmFrom12h(12, 0, 'PM')).toBe('12:00');
    expect(composeHhmmFrom12h(12, 0, 'AM')).toBe('00:00');
  });
});

describe('formatHhmm', () => {
  it('keeps 24h display', () => {
    expect(formatHhmm('09:00', '24h')).toBe('09:00');
    expect(formatHhmm('21:30', '24h')).toBe('21:30');
  });

  it('formats 12h display', () => {
    expect(formatHhmm('09:00', '12h')).toBe('9:00 AM');
    expect(formatHhmm('21:30', '12h')).toBe('9:30 PM');
  });
});

describe('formatStampString', () => {
  it('formats stamp in 24h', () => {
    expect(formatStampString('21:00:00.050', '24h')).toBe('21:00:00.050');
  });

  it('formats stamp in 12h', () => {
    expect(formatStampString('21:00:00.050', '12h')).toBe('9:00:00.050 PM');
  });
});
