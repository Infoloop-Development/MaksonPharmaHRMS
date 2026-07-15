import type { TourScript } from '../tourTypes';
import { tourElementExists } from '../tourDom';

export const reportsTourScript: TourScript = {
  phases: [
    {
      id: 'overview',
      steps: [
        {
          id: 'reports-header',
          title: 'Attendance reports',
          description:
            'Use Daily, Monthly, Department, and Location tabs to review attendance summaries and export Excel.',
          side: 'bottom',
        },
        {
          id: 'reports-tabs',
          title: 'Report types',
          description:
            'Daily Attendance: row per employee per day. Monthly Summary: aggregates. Department-wise and Location-wise: grouped totals.',
          side: 'bottom',
        },
      ],
    },
    {
      id: 'daily-filters',
      steps: [
        {
          id: 'reports-filters',
          title: 'Daily report filters',
          description:
            'Set From/To dates, optionally narrow by department or location. Clear restores the default 7-day window.',
          side: 'bottom',
        },
        {
          id: 'reports-export',
          title: 'Export and print',
          description:
            'Print to PDF opens a formatted print layout. Download Excel exports the full result set (not just visible rows).',
          side: 'left',
        },
      ],
    },
    {
      id: 'results',
      steps: [
        {
          id: 'reports-results',
          title: 'Report results',
          description:
            'Summary badges show present, absent, and weekly-off counts. Table lists entry/exit times, net hours, OT (real view), and status.',
          side: 'top',
        },
      ],
    },
    {
      id: 'other-tabs',
      steps: [
        {
          id: 'reports-monthly-hint',
          title: 'Other report tabs',
          description:
            'Switch tabs above for Monthly, Department, or Location reports; each has its own date range and filter controls.',
          side: 'bottom',
          when: () => tourElementExists('reports-monthly-hint'),
        },
      ],
    },
  ],
};
