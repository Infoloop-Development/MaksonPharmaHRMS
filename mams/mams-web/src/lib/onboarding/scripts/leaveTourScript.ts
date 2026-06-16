import type { TourScript } from '../tourTypes';
import { tourElementExists } from '../tourDom';

export const leaveTourScript: TourScript = {
  onCleanup: async (ctx) => {
    ctx.pageApi.closeModals?.();
  },
  phases: [
    {
      id: 'overview',
      steps: [
        {
          id: 'leave-header',
          title: 'Leave management',
          description:
            'Apply for leave, review team requests, and (with admin permission) manage holidays and leave policies.',
          side: 'bottom',
        },
        {
          id: 'leave-apply',
          title: 'Add leave',
          description:
            'Create a leave request with type, date range, and reason. Approvers can approve immediately if configured.',
          side: 'left',
          when: () => tourElementExists('leave-apply'),
        },
      ],
    },
    {
      id: 'tabs',
      steps: [
        {
          id: 'leave-tabs',
          title: 'Leave sections',
          description:
            'Requests: applications and approvals. Holidays: national calendar. Leave Settings: types, quotas, and rules.',
          side: 'bottom',
        },
      ],
    },
    {
      id: 'requests',
      steps: [
        {
          id: 'leave-content',
          title: 'Requests tab',
          description:
            'Filter by status, review balances, approve/reject pending items, or open details for notes and history.',
          side: 'top',
        },
      ],
    },
    {
      id: 'admin',
      steps: [
        {
          id: 'leave-holidays-hint',
          title: 'Holidays and settings',
          description:
            'Admins: switch to Holidays to manage the calendar, or Leave Settings to configure types and annual quotas.',
          side: 'bottom',
          when: () => tourElementExists('leave-holidays-hint'),
        },
      ],
    },
  ],
};
