export const STAT_CARD_TOOLTIPS = {
  leave: {
    leavesToday:
      'Approved leave covering today. Hover the card to see names when available.',
    pendingApprovals: 'Leave requests waiting for approver action. Click to filter the list.',
    upcoming7Days: 'Approved leave starting within the next 7 days.',
    leavesThisMonth: 'Total leave days consumed in the current calendar month.',
  },
  devices: {
    total: 'All registered biometric devices in the organization.',
    online: 'Devices that responded successfully on the last sync.',
    offline: 'Devices that failed or have not synced recently.',
    punches24h: 'Raw punch events received from all devices in the last 24 hours.',
  },
  visitors: {
    pending: 'Visitor requests awaiting approval.',
    approved: 'Approved visitor requests in scope.',
    rejected: 'Rejected visitor requests in scope.',
    total: 'All visitor requests matching filters.',
  },
  attendanceLog: {
    total: 'All punches matching current filters.',
    in: 'Check-in punches.',
    out: 'Check-out punches.',
    other: 'Punches that are neither in nor out.',
  },
  compliance: {
    allRecords: 'All compliance attendance rows for the selected filters.',
    morning: 'Morning (shift A) compliance records.',
    afternoon: 'Afternoon (shift B) compliance records.',
    night: 'Night (shift C) compliance records.',
  },
} as const;

export const TOPBAR_TOOLTIPS = {
  realView:
    'Real view shows actual clock times and 12-hour shift data. Sensitive fields may be visible per your role.',
  compliantView:
    'Compliant view shows 8-hour adjusted times for statutory reporting. Some fields are masked.',
  clock: 'Current date and time in IST. Green dot means you are online.',
} as const;
