import { z } from 'zod';

/** Must match Add User client validation in mams-web Settings.tsx */
export const PASSWORD_SPECIALS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`' as const;

export function passwordPolicyScore(p: string): number {
  let n = 0;
  if (/[a-z]/.test(p)) n += 1;
  if (/[A-Z]/.test(p)) n += 1;
  if (/[0-9]/.test(p)) n += 1;
  if ([...p].some((c) => PASSWORD_SPECIALS.includes(c))) n += 1;
  return n;
}

export const PasswordSchema = z
  .string()
  .min(10)
  .max(128)
  .refine((p) => passwordPolicyScore(p) >= 3, {
    message:
      'Password must be 10–128 characters and include at least 3 of: lowercase, uppercase, number, symbol (!@#$%^&*…).',
  });
