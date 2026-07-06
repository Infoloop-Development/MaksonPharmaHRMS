import { z } from 'zod';

export const BugPhaseLegacyKeySchema = z.enum([
  'new',
  'acknowledged',
  'in_progress',
  'resolved',
  'closed',
]);
export type BugPhaseLegacyKey = z.infer<typeof BugPhaseLegacyKeySchema>;

export const BugPhaseSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(80),
  order: z.number().int().min(0),
  isResolvedState: z.boolean(),
  legacyKey: BugPhaseLegacyKeySchema.nullable().optional(),
  reportCount: z.number().int().min(0).optional(),
});

export type BugPhase = z.infer<typeof BugPhaseSchema>;

export const BugPhaseCreateBodySchema = z.object({
  label: z.string().trim().min(1).max(80),
  isResolvedState: z.boolean().optional(),
});

export type BugPhaseCreateBody = z.infer<typeof BugPhaseCreateBodySchema>;

export const BugPhasePatchBodySchema = z
  .object({
    label: z.string().trim().min(1).max(80).optional(),
    isResolvedState: z.boolean().optional(),
  })
  .strict()
  .refine((v) => v.label !== undefined || v.isResolvedState !== undefined, {
    message: 'Provide label or isResolvedState',
  });

export type BugPhasePatchBody = z.infer<typeof BugPhasePatchBodySchema>;

export const BugPhaseReorderBodySchema = z.object({
  phaseIds: z.array(z.string()).min(1),
});

export type BugPhaseReorderBody = z.infer<typeof BugPhaseReorderBodySchema>;

export const BugPhaseDeleteBodySchema = z.object({
  reassignToPhaseId: z.string().optional(),
});

export const DEFAULT_BUG_PHASES: ReadonlyArray<{
  legacyKey: BugPhaseLegacyKey;
  label: string;
  order: number;
  isResolvedState: boolean;
}> = [
  { legacyKey: 'new', label: 'Raised', order: 0, isResolvedState: false },
  { legacyKey: 'acknowledged', label: 'Acknowledged', order: 1, isResolvedState: false },
  { legacyKey: 'in_progress', label: 'Under Development', order: 2, isResolvedState: false },
  { legacyKey: 'resolved', label: 'Developed', order: 3, isResolvedState: false },
  { legacyKey: 'closed', label: 'Pushed to Live', order: 4, isResolvedState: true },
];
