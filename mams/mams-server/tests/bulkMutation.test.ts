import { describe, expect, it } from 'vitest';
import { BulkIdsBodySchema, BULK_SELECTION_MAX } from '@mams/types';

describe('BulkIdsBodySchema', () => {
  it('accepts a non-empty id list up to the max', () => {
    const ids = Array.from({ length: BULK_SELECTION_MAX }, (_, i) => `507f1f77bcf86cd7994390${String(i).padStart(2, '0')}`);
    const parsed = BulkIdsBodySchema.parse({ ids });
    expect(parsed.ids).toHaveLength(BULK_SELECTION_MAX);
  });

  it('rejects empty id lists', () => {
    expect(() => BulkIdsBodySchema.parse({ ids: [] })).toThrow();
  });

  it('rejects more than the max ids', () => {
    const ids = Array.from({ length: BULK_SELECTION_MAX + 1 }, (_, i) => `id-${i}`);
    expect(() => BulkIdsBodySchema.parse({ ids })).toThrow();
  });
});
