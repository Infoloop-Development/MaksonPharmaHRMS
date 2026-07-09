import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/config/mail.js', () => ({
  isMailEnabled: () => true,
  isMailDevFileSink: () => false,
  useSmtpTransport: () => true,
  getAppPublicUrl: () => 'https://mams.example.com',
}));

vi.mock('../src/services/mailDelivery.service.js', () => ({
  deliverTransactionalEmail: vi.fn().mockResolvedValue({ ok: true }),
  resetMailTransportForTests: vi.fn(),
}));

vi.mock('nodemailer', () => ({
  default: { createTransport: vi.fn() },
}));

vi.mock('../src/services/publicOrgBranding.service.js', () => ({
  getPublicOrgBranding: vi.fn().mockResolvedValue({
    companyName: 'Test Org',
    companyLogo: null,
    favicon: null,
    orgBranding: {
      primaryColor: '#1A2878',
      secondaryColor: '#E82C2C',
      fontFamily: 'DM Sans',
      logoPalette: ['#1A2878'],
    },
  }),
}));

describe('sendWelcomeUserEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends branded welcome email with credentials and login URL', async () => {
    const { deliverTransactionalEmail } = await import('../src/services/mailDelivery.service.js');
    const { sendWelcomeUserEmail } = await import('../src/services/mail.service.js');

    const result = await sendWelcomeUserEmail({
      to: 'new.user@makson-group.com',
      name: 'Test User',
      role: 'hr.admin',
      email: 'new.user@makson-group.com',
      password: 'TempPass123!',
    });

    expect(result).toEqual({ ok: true });
    expect(vi.mocked(deliverTransactionalEmail)).toHaveBeenCalledOnce();

    const mail = vi.mocked(deliverTransactionalEmail).mock.calls[0]![0] as {
      to: string;
      subject: string;
      text: string;
      html: string;
    };
    expect(mail.to).toBe('new.user@makson-group.com');
    expect(mail.subject).toContain('Test Org');
    expect(mail.text).toContain('new.user@makson-group.com');
    expect(mail.text).toContain('TempPass123!');
    expect(mail.text).toContain('https://mams.example.com/login');
    expect(mail.html).toContain('HR Admin');
    expect(mail.html).toContain('Test Org');
    expect(mail.html).toContain('#1A2878');
    expect(mail.html).toContain('Sign in to MAMS');
    expect(mail.html).toContain('@media only screen and (max-width: 600px)');
    expect(mail.text).toMatch(/change your password/i);
  });
});
