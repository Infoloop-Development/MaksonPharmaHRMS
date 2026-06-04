import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

// Always load `mams-server/.env` (not cwd) so `npm run seed` and `npm run dev:server`
// from the monorepo root use the same file as `npm run dev` from mams-server.
const envDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(envDir, '..', '..', '.env') });

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  MONGO_URI: z.string().default('mongodb://localhost:27017/mams_dev'),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.string().default('info'),
  TZ: z.string().default('Asia/Kolkata'),
  SMART_ANCHOR_VERSION: z.string().default('v2.0.0'),
});

export const env = EnvSchema.parse(process.env);
export type Env = typeof env;
