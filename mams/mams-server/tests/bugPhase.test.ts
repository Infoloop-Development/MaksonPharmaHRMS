import { describe, expect, it } from 'vitest';
import {
  BugPhaseCreateBodySchema,
  BugPhasePatchBodySchema,
  BugPhaseReorderBodySchema,
  DEFAULT_BUG_PHASES,
} from '@mams/types';

describe('BugPhase schemas', () => {
  it('validates create body', () => {
    const parsed = BugPhaseCreateBodySchema.parse({ label: 'QA Review' });
    expect(parsed.label).toBe('QA Review');
    expect(parsed.isResolvedState).toBeUndefined();
  });

  it('validates patch body', () => {
    expect(BugPhasePatchBodySchema.parse({ label: 'Done' }).label).toBe('Done');
    expect(BugPhasePatchBodySchema.parse({ isResolvedState: true }).isResolvedState).toBe(true);
  });

  it('rejects empty patch body', () => {
    expect(() => BugPhasePatchBodySchema.parse({})).toThrow();
  });

  it('validates reorder body', () => {
    const parsed = BugPhaseReorderBodySchema.parse({ phaseIds: ['a', 'b'] });
    expect(parsed.phaseIds).toHaveLength(2);
  });
});

describe('DEFAULT_BUG_PHASES', () => {
  it('defines five default workflow phases', () => {
    expect(DEFAULT_BUG_PHASES).toHaveLength(5);
    expect(DEFAULT_BUG_PHASES[0]?.label).toBe('Raised');
    expect(DEFAULT_BUG_PHASES[4]?.isResolvedState).toBe(true);
  });
});
