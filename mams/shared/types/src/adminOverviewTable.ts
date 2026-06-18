import { z } from 'zod';

export const AdminOverviewTableKindSchema = z.enum([
  'attendance',
  'users',
  'audit',
  'devices',
  'employees',
]);
export type AdminOverviewTableKind = z.infer<typeof AdminOverviewTableKindSchema>;

export const ADMIN_OVERVIEW_TABLE_COLUMNS: Record<
  AdminOverviewTableKind,
  readonly { id: string; label: string }[]
> = {
  attendance: [
    { id: 'name', label: 'Name' },
    { id: 'empCode', label: 'ID' },
    { id: 'department', label: 'Department' },
    { id: 'shift', label: 'Shift' },
    { id: 'hours', label: 'Hours' },
    { id: 'status', label: 'Status' },
  ],
  users: [
    { id: 'name', label: 'Name' },
    { id: 'email', label: 'Email' },
    { id: 'role', label: 'Role' },
    { id: 'active', label: 'Active' },
    { id: 'lastLogin', label: 'Last login' },
    { id: 'permissionsCount', label: 'Permissions' },
  ],
  audit: [
    { id: 'occurredAt', label: 'Time' },
    { id: 'userName', label: 'User' },
    { id: 'userRole', label: 'Role' },
    { id: 'eventType', label: 'Event' },
    { id: 'entityType', label: 'Entity' },
    { id: 'pageBadge', label: 'Module' },
  ],
  devices: [
    { id: 'name', label: 'Name' },
    { id: 'deviceCode', label: 'Code' },
    { id: 'location', label: 'Location' },
    { id: 'online', label: 'Online' },
    { id: 'lastPing', label: 'Last ping' },
    { id: 'department', label: 'Department' },
    { id: 'vendor', label: 'Vendor' },
  ],
  employees: [
    { id: 'name', label: 'Name' },
    { id: 'empCode', label: 'Code' },
    { id: 'department', label: 'Department' },
    { id: 'status', label: 'Status' },
    { id: 'shift', label: 'Shift' },
    { id: 'location', label: 'Location' },
    { id: 'biometricId', label: 'Biometric ID' },
  ],
};

export const DEFAULT_ADMIN_OVERVIEW_TABLE_COLUMNS: Record<AdminOverviewTableKind, string[]> = {
  attendance: ['name', 'empCode', 'department', 'shift', 'hours', 'status'],
  users: ['name', 'email', 'role', 'active', 'lastLogin'],
  audit: ['occurredAt', 'userName', 'eventType', 'entityType'],
  devices: ['name', 'deviceCode', 'location', 'online', 'lastPing'],
  employees: ['name', 'empCode', 'department', 'status', 'shift'],
};

export const AdminOverviewTableConfigSchema = z
  .object({
    kind: AdminOverviewTableKindSchema,
    columns: z.array(z.string()).min(1),
  })
  .superRefine((val, ctx) => {
    const allowed = new Set(ADMIN_OVERVIEW_TABLE_COLUMNS[val.kind].map((c) => c.id));
    for (const col of val.columns) {
      if (!allowed.has(col)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Column "${col}" is not allowed for table kind ${val.kind}`,
        });
      }
    }
  });

export type AdminOverviewTableConfig = z.infer<typeof AdminOverviewTableConfigSchema>;

export const DEFAULT_ADMIN_OVERVIEW_TABLE: AdminOverviewTableConfig = {
  kind: 'attendance',
  columns: [...DEFAULT_ADMIN_OVERVIEW_TABLE_COLUMNS.attendance],
};
