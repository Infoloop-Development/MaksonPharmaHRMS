import { z } from 'zod';
import { UnmaskFieldGrantsSchema } from './sensitiveUnmask.js';

export const RoleSchema = z.enum(['org.admin', 'hr.admin', 'hr.compliance', 'it.admin']);
export type Role = z.infer<typeof RoleSchema>;

export const ViewModeSchema = z.enum(['real', 'compliant']);
export type ViewMode = z.infer<typeof ViewModeSchema>;

export const ThemePreferenceSchema = z.enum(['light', 'dark', 'system']);
export type ThemePreference = z.infer<typeof ThemePreferenceSchema>;

export const UpdatePreferencesRequestSchema = z.object({
  themePreference: ThemePreferenceSchema.optional(),
}).strict().refine((v) => v.themePreference !== undefined, {
  message: 'Provide at least one preference to update',
});
export type UpdatePreferencesRequest = z.infer<typeof UpdatePreferencesRequestSchema>;

export const PermissionSchema = z.enum([
  'read.real',
  'read.compliant',
  'write.adjust',
  'approve.adjust',
  'unmask.sensitive',
  'manage.users',
  'manage.employees',
  'manage.devices',
  'manage.settings',
  'manage.export_naming',
  'manage.org_users',
  'manage.org_settings',
  'manage.security',
  'read.org_audit',
  'manage.feature_flags',
  'read.system_health',
  'read.leave',
  'write.leave',
  'approve.leave',
  'manage.leave',
  'read.visitors',
  'approve.visitors',
  'manage.visitors',
  'read.compliance_activity',
  'write.employee_change',
  'approve.employee_change',
  'manage.recycle_bin',
  'manage.bug_reports',
]);
export type Permission = z.infer<typeof PermissionSchema>;

export const UserPublicSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: RoleSchema,
  viewMode: ViewModeSchema,
  permissions: z.array(PermissionSchema),
  unmaskFieldGrants: UnmaskFieldGrantsSchema.default([]),
  isActive: z.boolean(),
  mustChangePassword: z.boolean(),
  lastLoginAt: z.string().datetime().nullable(),
  completedOnboardingTours: z.array(z.string()).default([]),
  themePreference: ThemePreferenceSchema.default('light'),
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
    unmaskFieldGrants: UnmaskFieldGrantsSchema.optional(),
    isActive: z.boolean().optional(),
    mustChangePassword: z.boolean().optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    const keys = ['name', 'email', 'role', 'permissions', 'isActive', 'mustChangePassword'] as const;
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
  isFirstLogin: z.boolean().optional(),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const OnboardingTourIdSchema = z.enum([
  'dashboard',
  'employees',
  'attendance',
  'reports',
  'adjustments',
  'leave',
  'visitors',
  'devices',
  'settings',
  'admin-overview',
]);
export type OnboardingTourId = z.infer<typeof OnboardingTourIdSchema>;

export const CompleteOnboardingTourSchema = z.object({
  tour: OnboardingTourIdSchema,
});
export type CompleteOnboardingTour = z.infer<typeof CompleteOnboardingTourSchema>;

export const RefreshRequestSchema = z.object({
  refreshToken: z.string(),
});
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;

export const ROLE_LABELS: Record<Role, string> = {
  'org.admin': 'Organization Admin',
  'hr.admin': 'HR Admin',
  'hr.compliance': 'Compliance Auditor',
  'it.admin': 'IT Admin',
};
