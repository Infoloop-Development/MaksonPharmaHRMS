import { describe, it, expect, vi, beforeEach } from 'vitest';

const deliverTransactionalEmail = vi.fn().mockResolvedValue({ ok: true });

vi.mock('../src/services/mailDelivery.service.js', () => ({
  deliverTransactionalEmail,
}));

vi.mock('../src/config/mail.js', () => ({
  isMailEnabled: () => true,
  getAppPublicUrl: () => 'https://mams.example.com',
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
      logoPalette: [],
    },
  }),
}));

vi.mock('../src/models/User.js', () => ({
  UserModel: {
    findById: vi.fn((id: string) => ({
      select: vi.fn(() => ({
        lean: vi.fn(async () => {
          if (id === 'assignee-id') {
            return { email: 'it.admin@makson-group.com', name: 'IT Admin', isActive: true };
          }
          return null;
        }),
      })),
    })),
    find: vi.fn(() => ({
      select: vi.fn(() => ({
        lean: vi.fn(async () => [
          {
            _id: 'admin-1',
            email: 'it1@makson-group.com',
            name: 'IT One',
            permissions: ['manage.bug_reports'],
          },
        ]),
      })),
    })),
  },
}));

describe('bugNotificationEmail', () => {
  beforeEach(() => {
    deliverTransactionalEmail.mockClear();
  });

  it('emails assignee when bug is assigned', async () => {
    const { emailBugAssigned } = await import('../src/services/bugNotificationEmail.service.js');
    await emailBugAssigned({
      assigneeUserId: 'assignee-id',
      title: 'Login broken',
      assignerName: 'Priya',
      reportId: '507f1f77bcf86cd799439011',
    });

    expect(deliverTransactionalEmail).toHaveBeenCalledOnce();
    const mail = deliverTransactionalEmail.mock.calls[0]![0] as { to: string; subject: string; html: string };
    expect(mail.to).toBe('it.admin@makson-group.com');
    expect(mail.subject).toContain('assigned');
    expect(mail.html).toContain('Login broken');
    expect(mail.html).toContain('https://mams.example.com/admin/bug-reporting');
  });

  it('emails IT admins when a new bug is submitted', async () => {
    const { emailItAdminsNewBugReport } = await import('../src/services/bugNotificationEmail.service.js');
    await emailItAdminsNewBugReport({
      title: 'Dashboard error',
      reporterName: 'HR Admin',
      severity: 'high',
      module: 'Dashboard',
      reportId: '507f1f77bcf86cd799439011',
      reporterUserId: 'reporter-id',
    });

    expect(deliverTransactionalEmail).toHaveBeenCalledOnce();
    const mail = deliverTransactionalEmail.mock.calls[0]![0] as { subject: string; html: string };
    expect(mail.subject).toContain('New bug report');
    expect(mail.html).toContain('Dashboard error');
  });
});
