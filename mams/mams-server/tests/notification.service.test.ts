import { describe, it, expect } from 'vitest';
import { Types } from 'mongoose';
import {
  buildDeviceRegisteredNotification,
  buildLeaveAppliedNotification,
  buildVisitorSubmittedNotification,
} from '../src/services/notification.service.js';
import { isNotificationKindEnabled, resolveOrgNotificationAlerts } from '@mams/types';

describe('org notification alert toggles', () => {
  it('defaults all kinds to enabled', () => {
    const alerts = resolveOrgNotificationAlerts(undefined);
    expect(isNotificationKindEnabled(alerts, 'visitor_submitted')).toBe(true);
    expect(isNotificationKindEnabled(alerts, 'leave_applied')).toBe(true);
    expect(isNotificationKindEnabled(alerts, 'device_registered')).toBe(true);
  });

  it('respects disabled kinds', () => {
    const alerts = resolveOrgNotificationAlerts({ visitorSubmitted: false, leaveApplied: true, deviceRegistered: true });
    expect(isNotificationKindEnabled(alerts, 'visitor_submitted')).toBe(false);
    expect(isNotificationKindEnabled(alerts, 'leave_applied')).toBe(true);
  });
});

describe('notification builders', () => {
  const entityId = new Types.ObjectId();

  it('buildVisitorSubmittedNotification', () => {
    const n = buildVisitorSubmittedNotification({
      formTitle: 'Guest Access',
      publicSlug: 'guest-2026',
      entityId,
    });
    expect(n.kind).toBe('visitor_submitted');
    expect(n.href).toBe('/visitors');
    expect(n.message).toContain('Guest Access');
    expect(n.message).toContain('guest-2026');
  });

  it('buildLeaveAppliedNotification pending', () => {
    const n = buildLeaveAppliedNotification({
      employeeName: 'Alice',
      status: 'Pending',
      totalDays: 2,
      entityId,
    });
    expect(n.kind).toBe('leave_applied');
    expect(n.title).toContain('pending');
    expect(n.message).toContain('Alice');
    expect(n.message).toContain('pending approval');
  });

  it('buildLeaveAppliedNotification approved', () => {
    const n = buildLeaveAppliedNotification({
      employeeName: 'Bob',
      status: 'Approved',
      totalDays: 1,
      entityId,
    });
    expect(n.title).toContain('recorded');
    expect(n.message).not.toContain('pending approval');
  });

  it('buildDeviceRegisteredNotification', () => {
    const n = buildDeviceRegisteredNotification({
      name: 'Gate A',
      serialNumber: 'SN-001',
      model: 'K40',
      vendor: 'eSSL',
      entityId,
    });
    expect(n.kind).toBe('device_registered');
    expect(n.href).toBe('/devices');
    expect(n.message).toContain('Gate A');
    expect(n.message).toContain('SN-001');
  });
});
