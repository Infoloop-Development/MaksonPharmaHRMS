/**
 * Upsert a dummy first-time login user for testing the Dashboard onboarding tour.
 * Does not wipe other data. Safe to re-run (resets lastLoginAt + onboarding flags).
 *
 * Run: npm run seed:first-time-user
 */
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { PERMISSIONS_BY_ROLE } from '@mams/types';
import { connectDb, disconnectDb } from '../src/config/db.js';
import { UserModel } from '../src/models/User.js';
import { logger } from '../src/utils/logger.js';

const FirstTimeUserEnvSchema = z.object({
  FIRST_TIME_USER_EMAIL: z.string().email().default('tour.demo@makson-group.com'),
  FIRST_TIME_USER_PASSWORD: z.string().min(8).default('makson2026'),
  FIRST_TIME_USER_NAME: z.string().min(1).default('Tour Demo User'),
});

async function main() {
  const opts = FirstTimeUserEnvSchema.parse(process.env);
  await connectDb();

  const email = opts.FIRST_TIME_USER_EMAIL.toLowerCase();
  const passwordHash = await bcrypt.hash(opts.FIRST_TIME_USER_PASSWORD, 10);

  const user = await UserModel.findOneAndUpdate(
    { email },
    {
      $set: {
        email,
        passwordHash,
        name: opts.FIRST_TIME_USER_NAME,
        role: 'hr.admin',
        permissions: PERMISSIONS_BY_ROLE['hr.admin'],
        viewMode: 'real',
        isActive: true,
        mustChangePassword: false,
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: null,
        completedOnboardingTours: [],
      },
    },
    { upsert: true, new: true }
  );

  logger.info('First-time demo user ready', {
    id: String(user._id),
    email,
    password: opts.FIRST_TIME_USER_PASSWORD,
    lastLoginAt: user.lastLoginAt,
    completedOnboardingTours: user.completedOnboardingTours,
  });

  console.log('\n--- First-time tour demo user ---');
  console.log(`Email:    ${email}`);
  console.log(`Password: ${opts.FIRST_TIME_USER_PASSWORD}`);
  console.log('Log in once to see the Dashboard welcome tour.\n');

  await disconnectDb();
}

main().catch((err) => {
  logger.error('first_time_user_failed', { err: String(err) });
  process.exit(1);
});
