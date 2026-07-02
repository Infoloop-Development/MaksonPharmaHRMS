import { z } from 'zod';

export const RecycleBinEntityTypeSchema = z.enum(['employee', 'device', 'holiday', 'visitor_form']);
export type RecycleBinEntityType = z.infer<typeof RecycleBinEntityTypeSchema>;

export const RECYCLE_BIN_RETENTION_DAYS = 30;

export const RecycleBinItemRefSchema = z.object({
  entityType: RecycleBinEntityTypeSchema,
  id: z.string(),
});

export const RecycleBinListQuerySchema = z.object({
  entityType: RecycleBinEntityTypeSchema.optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export type RecycleBinListQuery = z.infer<typeof RecycleBinListQuerySchema>;

export interface RecycleBinDeletedBy {
  id: string;
  name: string;
}

export interface RecycleBinItem {
  id: string;
  entityType: RecycleBinEntityType;
  name: string;
  identifier: string;
  deletedAt: string;
  deletedBy: RecycleBinDeletedBy | null;
  daysRemaining: number;
}

export interface RecycleBinListResponse {
  items: RecycleBinItem[];
  total: number;
  page: number;
  pageSize: number;
}

export const RecycleBinBulkBodySchema = z.object({
  items: z.array(RecycleBinItemRefSchema).min(1).max(200),
});

export type RecycleBinBulkBody = z.infer<typeof RecycleBinBulkBodySchema>;

export const RECYCLE_BIN_ENTITY_LABELS: Record<RecycleBinEntityType, string> = {
  employee: 'Employee',
  device: 'Device',
  holiday: 'Holiday',
  visitor_form: 'Visitor form',
};
