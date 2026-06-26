import { z } from 'zod';

export const SortDirSchema = z.enum(['asc', 'desc']);
export type SortDir = z.infer<typeof SortDirSchema>;
