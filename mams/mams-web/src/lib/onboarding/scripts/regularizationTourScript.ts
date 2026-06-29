import type { TourActionMap, TourScript } from '../tourTypes';
import { tourElementExists } from '../tourDom';

export const REGULARIZATION_TOUR_ACTIONS: TourActionMap = {
  'create-opened': 'create-modal',
};

export const regularizationTourScript: TourScript = {
  onCleanup: async (ctx) => {
    ctx.pageApi.closeCreateModal?.();
  },
  phases: [
    {
      id: 'overview',
      steps: [
        {
          id: 'regularization-header',
          title: 'Attendance regularization',
          description:
            'Missed-punch corrections. Approved requests insert tagged raw punches and recompute derived attendance.',
          side: 'bottom',
        },
        {
          id: 'regularization-status-filters',
          title: 'Status filters',
          description: 'Filter by Pending, Approved, Rejected, or view All requests.',
          side: 'bottom',
        },
      ],
    },
    {
      id: 'create-intro',
      steps: [
        {
          id: 'regularization-create',
          title: 'New request',
          description:
            'Submit a missed IN or OUT punch with justification. Press Next to open the form preview.',
          side: 'left',
          when: () => tourElementExists('regularization-create'),
          onLeaveForward: async (ctx) => {
            ctx.pageApi.openCreateModal?.();
            await ctx.waitForSelector('regularization-create-modal', 2000);
          },
        },
      ],
    },
    {
      id: 'create-modal',
      onExit: async (ctx) => {
        ctx.pageApi.closeCreateModal?.();
      },
      steps: [
        {
          id: 'regularization-create-modal',
          title: 'Request form',
          description:
            'Pick employee, date, punch type, and requested time. Provide a clear reason; approvers see this in the audit log.',
          side: 'left',
          when: () => tourElementExists('regularization-create-modal'),
        },
      ],
    },
    {
      id: 'list',
      steps: [
        {
          id: 'regularization-list',
          title: 'Request list',
          description:
            'Open any card for full details. Approvers can approve or reject from the detail modal.',
          side: 'top',
        },
      ],
    },
  ],
};
