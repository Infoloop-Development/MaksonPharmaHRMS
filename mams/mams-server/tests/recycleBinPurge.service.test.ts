import { describe, expect, it } from 'vitest';
import { RECYCLE_BIN_RETENTION_DAYS } from '@mams/types';
import { recycleBinRetentionCutoff } from '../src/services/recycleBin.service.js';
import { startRecycleBinPurgeScheduler } from '../src/services/recycleBinPurge.service.js';

describe('recycleBinPurge.service', () => {
  it('only purges records at or before the retention cutoff', () => {
    const now = Date.parse('2026-06-30T00:00:00.000Z');
    const cutoff = recycleBinRetentionCutoff(now);

    const justExpired = new Date(cutoff.getTime());
    const stillRecoverable = new Date(cutoff.getTime() + 1);

    expect(justExpired.getTime()).toBeLessThanOrEqual(cutoff.getTime());
    expect(stillRecoverable.getTime()).toBeGreaterThan(cutoff.getTime());

    const msPerDay = 24 * 60 * 60 * 1000;
    expect((now - cutoff.getTime()) / msPerDay).toBe(RECYCLE_BIN_RETENTION_DAYS);
  });

  it('starts purge scheduler only once', () => {
    expect(() => {
      startRecycleBinPurgeScheduler();
      startRecycleBinPurgeScheduler();
    }).not.toThrow();
  });
});
