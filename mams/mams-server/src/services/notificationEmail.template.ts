import type { PublicOrgBranding } from './publicOrgBranding.service.js';
import { escapeHtml } from './welcomeEmail.template.js';

export interface NotificationEmailContentParams {
  recipientName: string;
  title: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string | null;
  branding: PublicOrgBranding;
}

function emailFontStack(fontFamily: string): string {
  const safe = fontFamily.replace(/["<>]/g, '');
  return `"${safe}", "DM Sans", "Segoe UI", Arial, sans-serif`;
}

function buildLogoCell(branding: PublicOrgBranding, primaryColor: string): string {
  const initial = branding.companyName.charAt(0).toUpperCase() || 'M';
  if (branding.companyLogo) {
    return `<img src="${escapeHtml(branding.companyLogo)}" alt="${escapeHtml(branding.companyName)}" width="40" height="40" style="display:block;width:40px;height:40px;border-radius:8px;border:1px solid #e2e6ed;background:#ffffff;object-fit:contain;padding:3px;" />`;
  }
  return `<div style="width:40px;height:40px;border-radius:8px;background:${escapeHtml(primaryColor)};color:#ffffff;font-size:16px;font-weight:700;line-height:40px;text-align:center;">${escapeHtml(initial)}</div>`;
}

export function buildNotificationEmailBodies(params: NotificationEmailContentParams): {
  text: string;
  html: string;
} {
  const { recipientName, title, message, ctaLabel, ctaUrl, branding } = params;
  const companyName = branding.companyName.trim() || 'Makson Group';
  const primary = branding.orgBranding.primaryColor;
  const fontStack = emailFontStack(branding.orgBranding.fontFamily);
  const logoCell = buildLogoCell(branding, primary);

  const textLines = [
    `Hi ${recipientName},`,
    '',
    title,
    '',
    message,
  ];
  if (ctaUrl && ctaLabel) {
    textLines.push('', `${ctaLabel}: ${ctaUrl}`);
  }
  textLines.push('', `- ${companyName} · MAMS`);

  const ctaHtml =
    ctaUrl && ctaLabel
      ? `<tr><td style="padding:20px 28px 0 28px;" align="center"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;min-height:44px;line-height:44px;padding:0 24px;background-color:${escapeHtml(primary)};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;">${escapeHtml(ctaLabel)}</a></td></tr>`
      : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style type="text/css">
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .email-card { padding: 20px 16px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f8f9fb;font-family:${fontStack};color:#1a1f36;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fb;">
    <tr><td align="center" style="padding:24px 16px;">
      <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td>
          <table role="presentation" width="100%" style="background:#ffffff;border:1px solid #e2e6ed;border-radius:12px;">
            <tr><td class="email-card" style="padding:24px 28px 8px 28px;">
              <table role="presentation"><tr>
                <td style="padding-right:12px;vertical-align:middle;">${logoCell}</td>
                <td style="vertical-align:middle;"><p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#4e5d78;font-weight:600;">${escapeHtml(companyName)}</p></td>
              </tr></table>
            </td></tr>
            <tr><td class="email-card" style="padding:8px 28px 0 28px;">
              <p style="margin:0 0 8px 0;font-size:14px;color:#4e5d78;">Hi ${escapeHtml(recipientName)},</p>
              <h1 style="margin:0 0 12px 0;font-size:20px;font-weight:700;color:#1a1f36;">${escapeHtml(title)}</h1>
              <p style="margin:0;font-size:15px;color:#4e5d78;line-height:1.5;">${escapeHtml(message)}</p>
            </td></tr>
            ${ctaHtml}
            <tr><td class="email-card" style="padding:24px 28px 28px 28px;">
              <p style="margin:0;font-size:11px;color:#94a3b8;">Makson Attendance Management System</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  return { text: textLines.join('\n'), html };
}

export function absoluteAppUrl(path: string, publicAppUrl: string): string {
  const base = publicAppUrl.replace(/\/$/, '');
  if (!path) return base;
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
