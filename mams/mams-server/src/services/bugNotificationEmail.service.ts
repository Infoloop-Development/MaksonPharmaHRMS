import { getAppPublicUrl, isMailEnabled } from '../config/mail.js';
import { UserModel } from '../models/User.js';
import { getPublicOrgBranding } from './publicOrgBranding.service.js';
import { deliverTransactionalEmail } from './mailDelivery.service.js';
import {
  absoluteAppUrl,
  buildNotificationEmailBodies,
} from './notificationEmail.template.js';
import { logger } from '../utils/logger.js';

async function loadActiveUserEmail(userId: string): Promise<{ email: string; name: string } | null> {
  const user = await UserModel.findById(userId).select('email name isActive').lean();
  if (!user?.isActive || !user.email?.trim()) return null;
  return { email: user.email.trim().toLowerCase(), name: user.name?.trim() || user.email };
}

export async function sendNotificationEmailToUser(
  userId: string,
  params: {
    title: string;
    message: string;
    href?: string | null;
    ctaLabel?: string;
    logContext: string;
  }
): Promise<void> {
  if (!isMailEnabled()) return;

  const recipient = await loadActiveUserEmail(userId);
  if (!recipient) return;

  const branding = await getPublicOrgBranding();
  const publicAppUrl = getAppPublicUrl();
  const ctaUrl = params.href ? absoluteAppUrl(params.href, publicAppUrl) : null;
  const { text, html } = buildNotificationEmailBodies({
    recipientName: recipient.name,
    title: params.title,
    message: params.message,
    ctaLabel: params.ctaLabel ?? (ctaUrl ? 'Open in MAMS' : undefined),
    ctaUrl,
    branding,
  });

  const result = await deliverTransactionalEmail({
    to: recipient.email,
    subject: params.title,
    text,
    html,
    logContext: params.logContext,
  });

  if (!result.ok) {
    logger.warn('notification_email_failed', {
      userId,
      to: recipient.email,
      context: params.logContext,
      error: result.error,
    });
  }
}

export async function emailItAdminsNewBugReport(params: {
  title: string;
  reporterName: string;
  severity: string;
  module: string;
  reportId: string;
  reporterUserId: string;
}): Promise<void> {
  if (!isMailEnabled()) return;

  const admins = await UserModel.find({ isActive: true })
    .select('email name permissions')
    .lean();

  const recipients = admins.filter(
    (u) =>
      u.email?.trim() &&
      u.permissions?.includes('manage.bug_reports') &&
      String(u._id) !== params.reporterUserId
  );

  if (recipients.length === 0) return;

  const branding = await getPublicOrgBranding();
  const publicAppUrl = getAppPublicUrl();
  const href = `/admin/bug-reporting?open=${params.reportId}`;
  const ctaUrl = absoluteAppUrl(href, publicAppUrl);
  const title = 'New bug report submitted';
  const message = `${params.reporterName} reported "${params.title}" (${params.severity} · ${params.module}).`;

  await Promise.all(
    recipients.map(async (admin) => {
      const name = admin.name?.trim() || admin.email!;
      const { text, html } = buildNotificationEmailBodies({
        recipientName: name,
        title,
        message,
        ctaLabel: 'Review bug report',
        ctaUrl,
        branding,
      });
      await deliverTransactionalEmail({
        to: admin.email!.trim().toLowerCase(),
        subject: title,
        text,
        html,
        logContext: 'bug_submitted_email',
      });
    })
  );
}

export async function emailBugAssigned(params: {
  assigneeUserId: string;
  title: string;
  assignerName: string;
  reportId: string;
}): Promise<void> {
  await sendNotificationEmailToUser(params.assigneeUserId, {
    title: 'Bug assigned to you',
    message: `${params.assignerName} assigned "${params.title}" to you.`,
    href: `/admin/bug-reporting?open=${params.reportId}`,
    ctaLabel: 'Open bug report',
    logContext: 'bug_assigned_email',
  });
}

export async function emailBugResolved(params: {
  reporterUserId: string;
  title: string;
  phaseLabel: string;
}): Promise<void> {
  await sendNotificationEmailToUser(params.reporterUserId, {
    title: 'Your bug report was resolved',
    message: `"${params.title}" was moved to ${params.phaseLabel}.`,
    logContext: 'bug_resolved_email',
  });
}

export async function emailBugMentioned(params: {
  mentionedUserId: string;
  title: string;
  authorName: string;
  reportId: string;
}): Promise<void> {
  await sendNotificationEmailToUser(params.mentionedUserId, {
    title: 'Mentioned on bug report',
    message: `${params.authorName} mentioned you on "${params.title}".`,
    href: `/admin/bug-reporting?open=${params.reportId}`,
    ctaLabel: 'View comment',
    logContext: 'bug_mentioned_email',
  });
}
