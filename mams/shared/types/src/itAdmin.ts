import { z } from 'zod';

export const ItAdminCreateBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().pipe(z.string().email()).transform((s) => s.toLowerCase()),
});
export type ItAdminCreateBody = z.infer<typeof ItAdminCreateBodySchema>;

export const ItAdminListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
});
export type ItAdminListItem = z.infer<typeof ItAdminListItemSchema>;

export const ItAdminListResponseSchema = z.object({
  items: z.array(ItAdminListItemSchema),
});
export type ItAdminListResponse = z.infer<typeof ItAdminListResponseSchema>;

export const ItAdminCreateResponseSchema = ItAdminListItemSchema.extend({
  initialPassword: z.string().min(1),
});
export type ItAdminCreateResponse = z.infer<typeof ItAdminCreateResponseSchema>;

export const BugReportAssigneeOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.literal('it.admin'),
});
export type BugReportAssigneeOption = z.infer<typeof BugReportAssigneeOptionSchema>;

export const BugReportAssigneesResponseSchema = z.object({
  items: z.array(BugReportAssigneeOptionSchema),
});
export type BugReportAssigneesResponse = z.infer<typeof BugReportAssigneesResponseSchema>;
