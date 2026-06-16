import type { TourActionMap, TourScript } from '../tourTypes';
import { tourElementExists } from '../tourDom';

export const ADJUSTMENTS_TOUR_ACTIONS: TourActionMap = {
  'create-opened': 'create-modal',
};

export const adjustmentsTourScript: TourScript = {
  onCleanup: async (ctx) => {
    ctx.pageApi.closeCreateModal?.();
  },
  phases: [
    {
      id: 'overview',
      steps: [
        {
          id: 'adjustments-header',
          title: 'Attendance adjustments',
          description:
            'HR-initiated corrections with mandatory justification, evidence reference, and immutable audit trail.',
          side: 'bottom',
        },
        {
          id: 'adjustments-status-filters',
          title: 'Status filters',
          description: 'Click Pending, Approved, Rejected, or All to filter the list. Pending count shows in the tile.',
          side: 'bottom',
        },
      ],
    },
    {
      id: 'create-intro',
      steps: [
        {
          id: 'adjustments-create',
          title: 'New adjustment',
          description:
            'Opens a form to correct entry/exit times, breaks, day type, or status. Press Next to preview the form.',
          side: 'left',
          when: () => tourElementExists('adjustments-create'),
          onLeaveForward: async (ctx) => {
            ctx.pageApi.openCreateModal?.();
            await ctx.waitForSelector('adjustments-create-modal', 2000);
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
          id: 'adjustments-create-modal',
          title: 'Adjustment form',
          description:
            'Select employee, date, and field to correct. Justification (10+ chars), evidence ref, and salary impact note are required.',
          side: 'left',
          when: () => tourElementExists('adjustments-create-modal'),
        },
      ],
    },
    {
      id: 'workflow',
      steps: [
        {
          id: 'adjustments-bulk-actions',
          title: 'Bulk approval',
          description:
            'Approvers can select multiple pending adjustments and approve or reject in one action with an optional note.',
          side: 'bottom',
          when: () => tourElementExists('adjustments-bulk-actions'),
        },
        {
          id: 'adjustments-list',
          title: 'Adjustment cards',
          description:
            'Each card shows employee, field changed, previous → new values, and audit trail. Click to review and approve/reject.',
          side: 'top',
        },
      ],
    },
  ],
};
