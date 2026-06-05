import { z } from 'zod';

export const ActivityPageSchema = z.enum(['employees', 'attendance', 'reports', 'devices', 'settings', 'auth']);
export type ActivityPage = z.infer<typeof ActivityPageSchema>;

/** Client-only UI events (POST /activity/log). Must start with `ui.`. */
export const UiActivityLogBodySchema = z.object({
  eventType: z
    .string()
    .min(4)
    .max(80)
    .refine((s) => s.startsWith('ui.'), { message: 'eventType must start with ui.' }),
  page: ActivityPageSchema,
  action: z.string().min(1).max(80),
  payload: z.record(z.unknown()).optional(),
});
export type UiActivityLogBody = z.infer<typeof UiActivityLogBodySchema>;

export const ActivityListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
export type ActivityListQuery = z.infer<typeof ActivityListQuerySchema>;

export const ActivityListItemSchema = z.object({
  id: z.string(),
  occurredAt: z.string().datetime(),
  eventType: z.string(),
  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  payload: z.record(z.unknown()),
});
export type ActivityListItem = z.infer<typeof ActivityListItemSchema>;

export const ActivityListResponseSchema = z.object({
  items: z.array(ActivityListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type ActivityListResponse = z.infer<typeof ActivityListResponseSchema>;
