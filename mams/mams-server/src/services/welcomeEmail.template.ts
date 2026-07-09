import type { Role } from '@mams/types';
import { ROLE_LABELS } from '@mams/types';
import type { PublicOrgBranding } from './publicOrgBranding.service.js';

export interface WelcomeEmailContentParams {
  name: string;
  role: Role;
  email: string;
  password: string;
  loginUrl: string;
  branding: PublicOrgBranding;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function emailFontStack(fontFamily: string): string {
  const safe = fontFamily.replace(/["<>]/g, '');
  return `"${safe}", "DM Sans", "Segoe UI", Arial, sans-serif`;
}

function buildLogoCell(branding: PublicOrgBranding, primaryColor: string): string {
  const initial = branding.companyName.charAt(0).toUpperCase() || 'M';
  if (branding.companyLogo) {
    return `<img src="${escapeHtml(branding.companyLogo)}" alt="${escapeHtml(branding.companyName)}" width="48" height="48" style="display:block;width:48px;height:48px;border-radius:8px;border:1px solid #e2e6ed;background:#ffffff;object-fit:contain;padding:3px;" />`;
  }
  return `<div style="width:48px;height:48px;border-radius:8px;background:${escapeHtml(primaryColor)};color:#ffffff;font-size:20px;font-weight:700;line-height:48px;text-align:center;">${escapeHtml(initial)}</div>`;
}

export function buildWelcomeEmailSubject(branding: PublicOrgBranding): string {
  const company = branding.companyName.trim() || 'MAMS';
  return `Your ${company} MAMS account — sign in and set your password`;
}

export function buildWelcomeEmailBodies(params: WelcomeEmailContentParams): { text: string; html: string } {
  const { name, role, email, password, loginUrl, branding } = params;
  const roleLabel = ROLE_LABELS[role];
  const companyName = branding.companyName.trim() || 'Makson Group';
  const primary = branding.orgBranding.primaryColor;
  const secondary = branding.orgBranding.secondaryColor;
  const fontStack = emailFontStack(branding.orgBranding.fontFamily);
  const logoCell = buildLogoCell(branding, primary);

  const text = [
    `Welcome to MAMS, ${name}.`,
    '',
    `${companyName} has created your account as ${roleLabel}.`,
    '',
    'Sign-in credentials:',
    `  Email:    ${email}`,
    `  Password: ${password}`,
    '',
    `Sign in at: ${loginUrl}`,
    '',
    'First-time login — change your password:',
    '  1. Open the sign-in URL above and log in with the credentials provided.',
    '  2. You will be prompted to set a new password before you can use the system.',
    '  3. Choose a strong password (at least 10 characters; include at least 3 of: uppercase, lowercase, number, symbol).',
    '',
    'Security: Do not share these credentials. If you did not expect this account, contact your HR or IT administrator immediately.',
    '',
    `- ${companyName} · Makson Attendance Management System`,
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Welcome to MAMS</title>
  <style type="text/css">
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .email-card { padding: 20px 16px !important; }
      .email-header-cell { display: block !important; width: 100% !important; text-align: center !important; }
      .email-header-logo { padding: 0 0 12px 0 !important; }
      .email-header-name { padding: 0 !important; text-align: center !important; }
      .email-cta { display: block !important; width: 100% !important; box-sizing: border-box !important; }
      .email-credentials td { display: block !important; width: 100% !important; padding: 4px 0 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f8f9fb;font-family:${fontStack};color:#1a1f36;line-height:1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fb;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:0 0 16px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #e2e6ed;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="height:4px;background-color:${escapeHtml(secondary)};font-size:0;line-height:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td class="email-card" style="padding:28px 28px 8px 28px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td class="email-header-cell email-header-logo" width="56" valign="middle" style="padding-right:12px;">
                          ${logoCell}
                        </td>
                        <td class="email-header-cell email-header-name" valign="middle">
                          <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#4e5d78;font-weight:600;line-height:1.4;">${escapeHtml(companyName)}</p>
                          <p style="margin:4px 0 0 0;font-size:13px;color:#8492a6;">Attendance Management System</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="email-card" style="padding:8px 28px 0 28px;">
                    <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#1a1f36;line-height:1.3;">Welcome, ${escapeHtml(name)}</h1>
                    <p style="margin:0 0 16px 0;font-size:15px;color:#4e5d78;">Your account has been created as <strong style="color:#1a1f36;">${escapeHtml(roleLabel)}</strong>.</p>
                    <span style="display:inline-block;padding:4px 10px;border-radius:999px;background-color:${escapeHtml(primary)};color:#ffffff;font-size:12px;font-weight:600;">${escapeHtml(roleLabel)}</span>
                  </td>
                </tr>
                <tr>
                  <td class="email-card" style="padding:24px 28px 0 28px;">
                    <p style="margin:0 0 10px 0;font-size:13px;font-weight:600;color:#1a1f36;text-transform:uppercase;letter-spacing:0.5px;">Sign-in credentials</p>
                    <table role="presentation" class="email-credentials" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f3f7;border:1px solid #e2e6ed;border-radius:8px;">
                      <tr>
                        <td style="padding:14px 16px 6px 16px;font-size:12px;color:#64748b;width:90px;vertical-align:top;">Email</td>
                        <td style="padding:14px 16px 6px 0;font-size:14px;font-family:Consolas,'Courier New',monospace;color:#1a1f36;word-break:break-all;">${escapeHtml(email)}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 16px 14px 16px;font-size:12px;color:#64748b;width:90px;vertical-align:top;">Password</td>
                        <td style="padding:6px 16px 14px 0;font-size:14px;font-family:Consolas,'Courier New',monospace;color:#1a1f36;word-break:break-all;">${escapeHtml(password)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="email-card" style="padding:24px 28px 0 28px;" align="center">
                    <a href="${escapeHtml(loginUrl)}" class="email-cta" style="display:inline-block;min-height:44px;line-height:44px;padding:0 28px;background-color:${escapeHtml(primary)};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">Sign in to MAMS</a>
                  </td>
                </tr>
                <tr>
                  <td class="email-card" style="padding:28px 28px 0 28px;">
                    <p style="margin:0 0 12px 0;font-size:13px;font-weight:600;color:#1a1f36;">First-time login: change your password</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td valign="top" width="28" style="padding:0 8px 12px 0;">
                          <span style="display:inline-block;width:22px;height:22px;border-radius:50%;background-color:${escapeHtml(secondary)};color:#ffffff;font-size:12px;font-weight:700;line-height:22px;text-align:center;">1</span>
                        </td>
                        <td style="padding:0 0 12px 0;font-size:14px;color:#4e5d78;">Open the sign-in link and log in with the email and temporary password above.</td>
                      </tr>
                      <tr>
                        <td valign="top" width="28" style="padding:0 8px 12px 0;">
                          <span style="display:inline-block;width:22px;height:22px;border-radius:50%;background-color:${escapeHtml(secondary)};color:#ffffff;font-size:12px;font-weight:700;line-height:22px;text-align:center;">2</span>
                        </td>
                        <td style="padding:0 0 12px 0;font-size:14px;color:#4e5d78;">You will be prompted to set a new password before you can use the system.</td>
                      </tr>
                      <tr>
                        <td valign="top" width="28" style="padding:0 8px 0 0;">
                          <span style="display:inline-block;width:22px;height:22px;border-radius:50%;background-color:${escapeHtml(secondary)};color:#ffffff;font-size:12px;font-weight:700;line-height:22px;text-align:center;">3</span>
                        </td>
                        <td style="padding:0;font-size:14px;color:#4e5d78;">Choose a strong password (at least 10 characters; include at least 3 of: uppercase, lowercase, number, symbol).</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="email-card" style="padding:24px 28px 28px 28px;">
                    <p style="margin:0;font-size:12px;color:#64748b;line-height:1.5;">
                      <strong style="color:#4e5d78;">Security:</strong> Do not share these credentials. If you did not expect this account, contact your HR or IT administrator immediately.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 16px 8px 16px;">
              <p style="margin:0;font-size:11px;color:#94a3b8;">Powered by MAMS · ${escapeHtml(companyName)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  return { text, html };
}
