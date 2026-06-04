import { z } from 'zod';

const truthy = new Set(['1', 'true', 'yes', 'on']);

function parseBool(v: string | undefined, defaultValue: boolean): boolean {
  if (v === undefined || v === '') return defaultValue;
  return truthy.has(v.toLowerCase());
}

const MailEnvSchema = z.object({
  MAIL_ENABLED: z.preprocess(
    (v) => parseBool(typeof v === 'string' ? v : undefined, false),
    z.boolean()
  ),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z.preprocess(
    (v) => parseBool(typeof v === 'string' ? v : undefined, false),
    z.boolean()
  ),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('MAMS <noreply@makson-group.com>'),
  APP_PUBLIC_URL: z.string().url().default('http://localhost:5173'),
});

const parsed = MailEnvSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid mail env: ${parsed.error.message}`);
}
const mailEnv = parsed.data;

export function isMailEnabled(): boolean {
  return mailEnv.MAIL_ENABLED;
}

export function getAppPublicUrl(): string {
  return mailEnv.APP_PUBLIC_URL.replace(/\/$/, '');
}

export function getSmtpFrom(): string {
  return mailEnv.SMTP_FROM;
}

export function getSmtpConfig(): {
  host: string;
  port: number;
  secure: boolean;
  auth?: { user: string; pass: string };
} {
  if (!mailEnv.SMTP_HOST) {
    throw new Error('SMTP_HOST is required when MAIL_ENABLED=true');
  }
  const port = mailEnv.SMTP_PORT ?? (mailEnv.SMTP_SECURE ? 465 : 587);
  const auth =
    mailEnv.SMTP_USER && mailEnv.SMTP_PASS
      ? { user: mailEnv.SMTP_USER, pass: mailEnv.SMTP_PASS }
      : undefined;
  return {
    host: mailEnv.SMTP_HOST,
    port,
    secure: mailEnv.SMTP_SECURE,
    ...(auth ? { auth } : {}),
  };
}
