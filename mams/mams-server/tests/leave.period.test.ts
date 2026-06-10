import { describe, it, expect } from 'vitest';
import { resolvePeriodKey } from '../src/services/leave/leavePeriod.service.js';

describe('resolvePeriodKey', () => {
  it('calendar year', () => {
    expect(resolvePeriodKey('calendar_year', '2026-06-15', '2020-01-01', 4)).toEqual({
      periodKey: '2026',
      periodType: 'calendar_year',
    });
  });

  it('financial year after April', () => {
    expect(resolvePeriodKey('financial_year', '2026-06-15', '2020-01-01', 4)).toEqual({
      periodKey: 'FY2026-27',
      periodType: 'financial_year',
    });
  });

  it('joining anniversary', () => {
    expect(resolvePeriodKey('joining_anniversary', '2026-06-15', '2020-03-01', 4)).toEqual({
      periodKey: 'JA-2026',
      periodType: 'joining_anniversary',
    });
  });
});
