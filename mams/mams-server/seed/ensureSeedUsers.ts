/**
 * Idempotent seed users — creates missing demo accounts and clears lockouts.
 * Does not reset passwords on existing users (use SEED_FORCE_PASSWORD=true to reset).
 * Run from monorepo root: npm run seed:users
 */
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { connectDb, disconnectDb } from '../src/config/db.js';
import { UserModel } from '../src/models/User.js';
import { PERMISSIONS_BY_ROLE } from '@mams/types';
import { logger } from '../src/utils/logger.js';

const SeedUsersEnvSchema = z.object({
  SEED_ORG_ADMIN_EMAIL: z.string().email().default('org.admin@makson-group.com'),
  SEED_ORG_ADMIN_NAME: z.string().min(1).default('Organization Admin'),
  SEED_HR_ADMIN_EMAIL: z.string().email().default('hr.admin@makson-group.com'),
  SEED_HR_COMPLIANCE_EMAIL: z.string().email().default('hr.compliance@makson-group.com'),
  SEED_DEFAULT_PASSWORD: z.string().min(8).default('makson2026'),
  SEED_HR_ADMIN_NAME: z.string().min(1).default('Priya Patel'),
  SEED_HR_COMPLIANCE_NAME: z.string().min(1).default('Compliance Auditor'),
  SEED_FORCE_PASSWORD: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

async function upsertUser(opts: {
  email: string;
  name: string;
  role: 'org.admin' | 'hr.admin' | 'hr.compliance';
  viewMode: 'real' | 'compliant';
  passwordHash: string;
  forcePassword: boolean;
}) {
  const email = opts.email.toLowerCase();
  const existing = await UserModel.findOne({ email });
  if (existing) {
    existing.name = opts.name;
    existing.role = opts.role;
    existing.viewMode = opts.viewMode;
    existing.permissions = PERMISSIONS_BY_ROLE[opts.role];
    if (opts.forcePassword) existing.passwordHash = opts.passwordHash;
    existing.isActive = true;
    existing.mustChangePassword = false;
    existing.failedLoginCount = 0;
    existing.lockedUntil = null;
    await existing.save();
    logger.info('Updated seed user', { email, role: opts.role, passwordReset: opts.forcePassword });
    return opts.forcePassword ? 'updated_password' : 'updated';
  }
  await UserModel.create({
    email,
    name: opts.name,
    role: opts.role,
    viewMode: opts.viewMode,
    permissions: PERMISSIONS_BY_ROLE[opts.role],
    passwordHash: opts.passwordHash,
    isActive: true,
    mustChangePassword: false,
    failedLoginCount: 0,
    lockedUntil: null,
  });
  logger.info('Created seed user', { email, role: opts.role });
  return 'created';
}

async function main() {
  const seedUsers = SeedUsersEnvSchema.parse(process.env);
  await connectDb();
  const passwordHash = await bcrypt.hash(seedUsers.SEED_DEFAULT_PASSWORD, 10);

  const results = await Promise.all([
    upsertUser({
      email: seedUsers.SEED_ORG_ADMIN_EMAIL,
      name: seedUsers.SEED_ORG_ADMIN_NAME,
      role: 'org.admin',
      viewMode: 'real',
      passwordHash,
      forcePassword: seedUsers.SEED_FORCE_PASSWORD,
    }),
    upsertUser({
      email: seedUsers.SEED_HR_ADMIN_EMAIL,
      name: seedUsers.SEED_HR_ADMIN_NAME,
      role: 'hr.admin',
      viewMode: 'real',
      passwordHash,
      forcePassword: seedUsers.SEED_FORCE_PASSWORD,
    }),
    upsertUser({
      email: seedUsers.SEED_HR_COMPLIANCE_EMAIL,
      name: seedUsers.SEED_HR_COMPLIANCE_NAME,
      role: 'hr.compliance',
      viewMode: 'compliant',
      passwordHash,
      forcePassword: seedUsers.SEED_FORCE_PASSWORD,
    }),
  ]);

  logger.info('ensureSeedUsers done', {
    orgAdmin: seedUsers.SEED_ORG_ADMIN_EMAIL,
    hrAdmin: seedUsers.SEED_HR_ADMIN_EMAIL,
    compliance: seedUsers.SEED_HR_COMPLIANCE_EMAIL,
    defaultPasswordForNewUsers: seedUsers.SEED_DEFAULT_PASSWORD,
    forcePassword: seedUsers.SEED_FORCE_PASSWORD,
    results,
  });
  await disconnectDb();
}

main().catch((err) => {
  logger.error('ensureSeedUsers_failed', { err: String(err) });
  process.exit(1);
});
