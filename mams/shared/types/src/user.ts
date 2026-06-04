import { z } from 'zod';

export const RoleSchema = z.enum(['hr.admin', 'hr.compliance', 'it.admin']);
export type Role = z.infer<typeof RoleSchema>;

export const ViewModeSchema = z.enum(['real', 'compliant']);
export type ViewMode = z.infer<typeof ViewModeSchema>;

export const PermissionSchema = z.enum([
  'read.real',
  'read.compliant',
  'write.adjust',
  'approve.adjust',
  'unmask.sensitive',
  'manage.users',
  'manage.devices',
  'manage.settings',
]);
export type Permission = z.infer<typeof PermissionSchema>;

export const UserPublicSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: RoleSchema,
  viewMode: ViewModeSchema,
  permissions: z.array(PermissionSchema),
  isActive: z.boolean(),
  mustChangePassword: z.boolean(),
  lastLoginAt: z.string().datetime().nullable(),
});
export type UserPublic = z.infer<typeof UserPublicSchema>;

export const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
});
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;

export const UserUpdateBodySchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    email: z.string().trim().pipe(z.string().email()).transform((s) => s.toLowerCase()).optional(),
    role: RoleSchema.optional(),
    permissions: z.array(PermissionSchema).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    const keys = ['name', 'email', 'role', 'permissions', 'isActive'] as const;
    const count = keys.filter((k) => val[k] !== undefined).length;
    if (count < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Provide at least one field to update' });
    }
  });
export type UserUpdateBody = z.infer<typeof UserUpdateBodySchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  user: UserPublicSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const RefreshRequestSchema = z.object({
  refreshToken: z.string(),
});
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;
