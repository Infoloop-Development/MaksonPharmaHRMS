import { z } from 'zod';

export const BulkIdsBodySchema = z.object({
  ids: z.array(z.string()).min(1).max(200),
});

export type BulkIdsBody = z.infer<typeof BulkIdsBodySchema>;

export interface BulkMutationError {
  id: string;
  reason: string;
}

export interface BulkMutationResult {
  succeeded: number;
  skipped: number;
  errors: BulkMutationError[];
}

export const BULK_SELECTION_MAX = 200;
