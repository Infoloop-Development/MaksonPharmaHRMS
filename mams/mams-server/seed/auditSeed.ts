import type { Types } from 'mongoose';
import { AuditLogModel } from '../src/models/AuditLog.js';
import { logger } from '../src/utils/logger.js';
import { seededRandom } from '../src/utils/prng.js';

type SeedUser = { _id: Types.ObjectId; email: string; role: string };

const EVENT_TEMPLATES: Array<{ eventType: string; entityType?: string }> = [
  { eventType: 'login' },
  { eventType: 'login_failed' },
  { eventType: 'logout' },
  { eventType: 'ui.dashboard.filter' },
  { eventType: 'ui.dashboard.export_pdf' },
  { eventType: 'dashboard_layout_saved' },
  { eventType: 'dashboard_kpi_saved' },
  { eventType: 'ui.reports.print' },
  { eventType: 'ui.reports.export_csv' },
  { eventType: 'ui.devices.filter', entityType: 'Device' },
  { eventType: 'device_ping', entityType: 'Device' },
  { eventType: 'employee_created', entityType: 'Employee' },
  { eventType: 'ui.employees.filter', entityType: 'Employee' },
  { eventType: 'settings_changed', entityType: 'Settings' },
  { eventType: 'user_updated', entityType: 'User' },
  { eventType: 'admin_overview_widgets_saved' },
  { eventType: 'ui.admin.filter' },
  { eventType: 'leave_application_created', entityType: 'LeaveApplication' },
  { eventType: 'password_changed' },
];

function istOccurredAt(date: string, hour: number, minute: number): Date {
  return new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+05:30`);
}

export async function seedAuditData(params: {
  dates: string[];
  users: SeedUser[];
}): Promise<number> {
  const batch: Array<{
    occurredAt: Date;
    userId: Types.ObjectId | null;
    ipAddress: string;
    userAgent: string;
    eventType: string;
    entityType: string | null;
    payload: Record<string, unknown>;
  }> = [];

  for (const date of params.dates) {
    const r = seededRandom(parseInt(date.replace(/-/g, ''), 10) * 17 + 9001);
    const eventsPerDay = 28 + Math.floor(r() * 12);

    for (let i = 0; i < eventsPerDay; i++) {
      const tpl = EVENT_TEMPLATES[i % EVENT_TEMPLATES.length]!;
      const user = params.users[i % params.users.length]!;
      const hour = 8 + Math.floor(r() * 10);
      const minute = Math.floor(r() * 60);
      const isLoginFail = tpl.eventType === 'login_failed';

      batch.push({
        occurredAt: istOccurredAt(date, hour, minute),
        userId: isLoginFail ? null : user._id,
        ipAddress: '127.0.0.1',
        userAgent: 'MAMS-Seed/1.0',
        eventType: tpl.eventType,
        entityType: tpl.entityType ?? null,
        payload: {
          source: 'seed',
          email: isLoginFail ? 'unknown@example.com' : user.email,
          role: user.role,
        },
      });
    }

    for (let ui = 0; ui < params.users.length; ui++) {
      const user = params.users[ui]!;
      batch.push({
        occurredAt: istOccurredAt(date, 9 + ui, 15),
        userId: user._id,
        ipAddress: '127.0.0.1',
        userAgent: 'MAMS-Seed/1.0',
        eventType: 'login',
        entityType: null,
        payload: { source: 'seed', email: user.email },
      });
    }
  }

  if (batch.length > 0) {
    await AuditLogModel.insertMany(batch, { ordered: false });
  }

  logger.info('Seeded audit logs', { count: batch.length, days: params.dates.length });
  return batch.length;
}
