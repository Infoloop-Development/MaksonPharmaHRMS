import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' });
const createTransport = vi.fn(() => ({ sendMail }));

vi.mock('nodemailer', () => ({
  default: { createTransport },
}));

vi.mock('../src/config/mail.js', () => ({
  isMailEnabled: () => true,
  getAppPublicUrl: () => 'http://localhost:5173',
  getSmtpFrom: () => 'MAMS <noreply@test.local>',
  getSmtpConfig: () => ({ host: 'localhost', port: 1025, secure: false }),
}));

describe('sendWelcomeUserEmail', () => {
  beforeEach(() => {
    sendMail.mockClear();
    createTransport.mockClear();
  });

  it('sends welcome email with credentials and login URL', async () => {
    const { sendWelcomeUserEmail, resetMailTransportForTests } = await import('../src/services/mail.service.js');
    resetMailTransportForTests();

    const result = await sendWelcomeUserEmail({
      to: 'new.user@makson-group.com',
      name: 'Test User',
      role: 'hr.admin',
      email: 'new.user@makson-group.com',
      password: 'TempPass123!',
    });

    expect(result).toEqual({ ok: true });
    expect(createTransport).toHaveBeenCalledOnce();
    expect(sendMail).toHaveBeenCalledOnce();

    const mail = sendMail.mock.calls[0]![0] as {
      to: string;
      subject: string;
      text: string;
      html: string;
    };
    expect(mail.to).toBe('new.user@makson-group.com');
    expect(mail.subject).toContain('MAMS');
    expect(mail.text).toContain('new.user@makson-group.com');
    expect(mail.text).toContain('TempPass123!');
    expect(mail.text).toContain('http://localhost:5173/login');
    expect(mail.html).toContain('HR Admin');
    expect(mail.text).toMatch(/change your password/i);
  });
});
