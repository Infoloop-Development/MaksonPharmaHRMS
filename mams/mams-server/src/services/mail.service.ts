import type { Role } from '@mams/types';
import { getAppPublicUrl } from '../config/mail.js';
import { getPublicOrgBranding } from './publicOrgBranding.service.js';
import {
  buildWelcomeEmailBodies,
  buildWelcomeEmailSubject,
} from './welcomeEmail.template.js';
import { deliverTransactionalEmail, type EmailDeliveryResult } from './mailDelivery.service.js';

export interface WelcomeEmailParams {
  to: string;
  name: string;
  role: Role;
  email: string;
  password: string;
}

export type WelcomeEmailResult = EmailDeliveryResult;

export async function sendWelcomeUserEmail(params: WelcomeEmailParams): Promise<WelcomeEmailResult> {
  const loginUrl = `${getAppPublicUrl()}/login`;
  const branding = await getPublicOrgBranding();
  const subject = buildWelcomeEmailSubject(branding);
  const { text, html } = buildWelcomeEmailBodies({
    name: params.name,
    role: params.role,
    email: params.email,
    password: params.password,
    loginUrl,
    branding,
  });

  return deliverTransactionalEmail({
    to: params.to,
    subject,
    text,
    html,
    logContext: 'welcome_email',
  });
}

/** @internal test hook */
export { resetMailTransportForTests } from './mailDelivery.service.js';
