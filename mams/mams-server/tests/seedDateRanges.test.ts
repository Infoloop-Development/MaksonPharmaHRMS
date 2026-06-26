import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  buildAnchorSeedDays,
  buildLastNSeedDays,
  buildMergedSeedDays,
  buildRollingSeedDays,
  mergeSeedDays,
} from '../seed/seedDateRanges.js';

describe('seedDateRanges', () => {
  const fixedNow = new Date('2026-06-02T10:00:00+05:30');

  beforeEach(() => {
    delete process.env.SEED_DEMO_ANCHOR_DATE;
  });

  afterEach(() => {
    delete process.env.SEED_DEMO_ANCHOR_DATE;
  });

  it('buildRollingSeedDays returns 8 days ending tomorrow', () => {
    const days = buildRollingSeedDays(fixedNow);
    expect(days).toHaveLength(8);
    expect(days[0]?.date).toBe('2026-05-27');
    expect(days[6]?.date).toBe('2026-06-02');
    expect(days[7]?.date).toBe('2026-06-03');
  });

  it('buildAnchorSeedDays spans anchor-6 through anchor+1', () => {
    const days = buildAnchorSeedDays('2026-06-18');
    expect(days[0]?.date).toBe('2026-06-12');
    expect(days[6]?.date).toBe('2026-06-18');
    expect(days[7]?.date).toBe('2026-06-19');
  });

  it('mergeSeedDays dedupes overlapping dates', () => {
    const rolling = buildRollingSeedDays(fixedNow);
    const anchor = buildAnchorSeedDays('2026-06-02');
    const merged = mergeSeedDays(rolling, anchor);
    expect(merged).toHaveLength(8);
  });

  it('buildLastNSeedDays returns N days ending today', () => {
    const days = buildLastNSeedDays(10, fixedNow);
    expect(days).toHaveLength(10);
    expect(days[0]?.date).toBe('2026-05-24');
    expect(days[9]?.date).toBe('2026-06-02');
  });

  it('buildMergedSeedDays unions rolling and demo anchor when they differ', () => {
    process.env.SEED_DEMO_ANCHOR_DATE = '2026-06-18';
    const { days, anchorDate } = buildMergedSeedDays(fixedNow);
    expect(anchorDate).toBe('2026-06-18');
    expect(days.some((d) => d.date === '2026-06-02')).toBe(true);
    expect(days.some((d) => d.date === '2026-06-18')).toBe(true);
    expect(days.length).toBeGreaterThan(8);
  });
});
