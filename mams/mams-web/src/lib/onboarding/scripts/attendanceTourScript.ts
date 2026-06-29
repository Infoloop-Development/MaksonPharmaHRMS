import type { TourScript } from '../tourTypes';
import { tourElementExists } from '../tourDom';

export const attendanceTourScript: TourScript = {
  onCleanup: async (ctx) => {
    ctx.pageApi.clearFilters?.();
  },
  phases: [
    {
      id: 'overview',
      steps: [
        {
          id: 'attendance-header',
          title: 'Live attendance log',
          description:
            'Real-time punches from biometric devices (refreshes every 5s) or search historical records with filters.',
          side: 'bottom',
        },
        {
          id: 'attendance-live-badge',
          title: 'Live mode',
          description:
            'When no filters are active, you are in LIVE mode; new punches appear automatically without refreshing.',
          side: 'left',
          when: () => tourElementExists('attendance-live-badge'),
        },
      ],
    },
    {
      id: 'stats',
      steps: [
        {
          id: 'attendance-stats',
          title: 'Punch summary tiles',
          description:
            'Total, IN, OUT, and OTHER counts. Click a tile to filter the list below. Counts respect your current search and date.',
          side: 'bottom',
        },
      ],
    },
    {
      id: 'filters',
      onExit: async (ctx) => {
        ctx.pageApi.clearFilters?.();
      },
      steps: [
        {
          id: 'attendance-filters-search',
          title: 'Employee search',
          description: 'Search by name, employee code, or biometric ID. Combine with date and punch-type filters.',
          side: 'bottom',
        },
        {
          id: 'attendance-filters-date',
          title: 'Date filter',
          description: 'Pick a specific IST date to review historical punches instead of live tail.',
          side: 'bottom',
        },
        {
          id: 'attendance-filters-type',
          title: 'Punch type',
          description: 'Filter to IN, OUT, or OTHER punches only. OTHER covers non-standard device events.',
          side: 'bottom',
        },
        {
          id: 'attendance-outside-shift',
          title: 'Outside shift clock-ins',
          description:
            'When enabled, shows only IN punches recorded outside the employee’s main Day/Night shift window from Settings.',
          side: 'bottom',
        },
      ],
    },
    {
      id: 'list',
      steps: [
        {
          id: 'attendance-list',
          title: 'Punch list',
          description:
            'Each row shows time, employee, punch type, shift window, and outside-shift flag. Flagged rows are highlighted amber.',
          side: 'top',
        },
      ],
    },
  ],
};
