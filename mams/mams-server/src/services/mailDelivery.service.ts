import nodemailer from 'nodemailer';
import {
  getSmtpConfig,
  getSmtpFrom,
  isMailEnabled,
  isMailDevFileSink,
  useSmtpTransport,
} from '../config/mail.js';
import { writeWelcomeEmailToDevSink } from './mailDevSink.service.js';
import { logger } from '../utils/logger.js';

let transport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter {
  if (!transport) {
    transport = nodemailer.createTransport(getSmtpConfig());
  }
  return transport;
}

export type EmailDeliveryResult =
  | { ok: true; devSinkPath?: string }
  | { ok: false; error: string };

export async function deliverTransactionalEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
  logContext?: string;
}): Promise<EmailDeliveryResult> {
  if (!isMailEnabled()) {
    return { ok: false, error: 'mail_disabled' };
  }

  if (isMailDevFileSink()) {
    try {
      const devSinkPath = await writeWelcomeEmailToDevSink({
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });
      logger.info(params.logContext ?? 'email_dev_sink', { to: params.to, path: devSinkPath });
      return { ok: true, devSinkPath };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`${params.logContext ?? 'email'}_dev_sink_failed`, { to: params.to, error: message });
      return { ok: false, error: message };
    }
  }

  if (!useSmtpTransport()) {
    return { ok: false, error: 'mail_disabled' };
  }

  try {
    await getTransport().sendMail({
      from: getSmtpFrom(),
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(params.logContext ?? 'email_failed', { to: params.to, error: message });
    return { ok: false, error: message };
  }
}

/** @internal test hook */
export function resetMailTransportForTests(): void {
  transport = null;
}
