import nodemailer from 'nodemailer';
import type { Role } from '@mams/types';
import { getAppPublicUrl, getSmtpConfig, getSmtpFrom, isMailEnabled } from '../config/mail.js';
import { logger } from '../utils/logger.js';

const ROLE_LABELS: Record<Role, string> = {
  'hr.admin': 'HR Admin',
  'hr.compliance': 'Compliance Officer',
  'it.admin': 'IT Admin',
};

let transport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter {
  if (!transport) {
    transport = nodemailer.createTransport(getSmtpConfig());
  }
  return transport;
}

export interface WelcomeEmailParams {
  to: string;
  name: string;
  role: Role;
  email: string;
  password: string;
}

function buildWelcomeBodies(params: WelcomeEmailParams & { loginUrl: string }) {
  const roleLabel = ROLE_LABELS[params.role];
  const text = [
    `Welcome to MAMS (Makson Attendance Management System), ${params.name}.`,
    '',
    `Your account has been created as ${roleLabel}.`,
    '',
    'Sign-in credentials:',
    `  Email:    ${params.email}`,
    `  Password: ${params.password}`,
    '',
    `Sign in at: ${params.loginUrl}`,
    '',
    'First-time login — change your password:',
    '  1. Open the sign-in URL above and log in with the credentials provided.',
    '  2. You will be prompted to set a new password before you can use the system.',
    '  3. Choose a strong password (at least 10 characters; include at least 3 of: uppercase, lowercase, number, symbol).',
    '',
    'Security: Do not share these credentials. If you did not expect this account, contact your HR or IT administrator immediately.',
    '',
    '— Makson Attendance Management System',
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>MAMS account</title></head>
<body style="font-family: Calibri, Arial, sans-serif; color: #0F172A; line-height: 1.5; max-width: 560px;">
  <p>Welcome to <strong>MAMS</strong> (Makson Attendance Management System), ${escapeHtml(params.name)}.</p>
  <p>Your account has been created as <strong>${escapeHtml(roleLabel)}</strong>.</p>
  <h3 style="font-size: 14px; margin-bottom: 8px;">Sign-in credentials</h3>
  <table style="border-collapse: collapse; font-size: 14px;">
    <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Email</td><td style="font-family: monospace;">${escapeHtml(params.email)}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Password</td><td style="font-family: monospace;">${escapeHtml(params.password)}</td></tr>
  </table>
  <p style="margin-top: 16px;"><a href="${escapeHtml(params.loginUrl)}" style="color: #1D5DBF;">Sign in to MAMS</a></p>
  <h3 style="font-size: 14px; margin-bottom: 8px;">First-time login — change your password</h3>
  <ol style="padding-left: 20px; font-size: 14px;">
    <li>Open the sign-in link above and log in with the credentials provided.</li>
    <li>You will be prompted to set a new password before you can use the system.</li>
    <li>Choose a strong password (at least 10 characters; include at least 3 of: uppercase, lowercase, number, symbol).</li>
  </ol>
  <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
    <strong>Security:</strong> Do not share these credentials. If you did not expect this account, contact your HR or IT administrator immediately.
  </p>
  <p style="font-size: 12px; color: #94a3b8;">— Makson Attendance Management System</p>
</body>
</html>`.trim();

  return { text, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type WelcomeEmailResult = { ok: true } | { ok: false; error: string };

export async function sendWelcomeUserEmail(params: WelcomeEmailParams): Promise<WelcomeEmailResult> {
  if (!isMailEnabled()) {
    return { ok: false, error: 'mail_disabled' };
  }

  const loginUrl = `${getAppPublicUrl()}/login`;
  const { text, html } = buildWelcomeBodies({ ...params, loginUrl });

  try {
    await getTransport().sendMail({
      from: getSmtpFrom(),
      to: params.to,
      subject: 'Your MAMS account — sign-in and first-time password change',
      text,
      html,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('welcome_email_failed', { to: params.to, error: message });
    return { ok: false, error: message };
  }
}

/** @internal test hook */
export function resetMailTransportForTests(): void {
  transport = null;
}
