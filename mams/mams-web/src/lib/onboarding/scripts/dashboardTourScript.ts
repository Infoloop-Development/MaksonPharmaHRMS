import type { TourActionMap, TourScript } from '../tourTypes';
import { tourElementExists } from '../tourDom';

export const DASHBOARD_TOUR_ACTIONS: TourActionMap = {
  'kpi-edit-opened': 'kpi-edit',
  'layout-edit-opened': 'layout-edit',
};

export const dashboardTourScript: TourScript = {
  onCleanup: async (ctx) => {
    ctx.pageApi.cancelKpiEdit?.();
    ctx.pageApi.cancelLayoutEdit?.();
    ctx.pageApi.resetView?.();
  },
  phases: [
    {
      id: 'overview',
      steps: [
        {
          id: 'dashboard-header',
          title: 'Dashboard overview',
          description:
            'Your attendance command centre. The date shown is the active day — KPIs, charts, and the table below all reflect this date.',
          side: 'bottom',
        },
        {
          id: 'dashboard-kpi-grid',
          title: 'KPI tiles',
          description:
            'These tiles summarise headcount, present, absent, late, and more for the selected day. Click any tile to filter everything below.',
          side: 'bottom',
        },
      ],
    },
    {
      id: 'filtering',
      onExit: async (ctx) => {
        ctx.pageApi.resetView?.();
      },
      steps: [
        {
          id: 'dashboard-kpi-grid',
          title: 'Try filtering',
          description:
            'Click Present (or any KPI) to filter charts and the attendance table. We will apply a sample filter when you press Next.',
          side: 'bottom',
          onLeaveForward: async (ctx) => {
            ctx.pageApi.demoKpiFilter?.();
            await ctx.waitForSelector('dashboard-filter-bar', 2000);
          },
        },
        {
          id: 'dashboard-filter-bar',
          title: 'Active filters and reset',
          description:
            'This bar shows your active filters — date, status, and shift. Use Reset to Default View to clear filters and return to today’s full dashboard.',
          side: 'bottom',
          when: () => tourElementExists('dashboard-filter-bar'),
        },
      ],
    },
    {
      id: 'kpi-edit-intro',
      steps: [
        {
          id: 'dashboard-kpi-edit',
          title: 'Customize KPIs',
          description:
            'This pencil opens KPI customization. Press Next to enter edit mode, or click the pencil yourself.',
          side: 'left',
          allowInteraction: true,
          onLeaveForward: async (ctx) => {
            ctx.pageApi.enterKpiEdit?.();
            await ctx.waitForSelector('dashboard-kpi-edit-toolbar', 2500);
          },
        },
      ],
    },
    {
      id: 'kpi-edit',
      onExit: async (ctx) => {
        ctx.pageApi.cancelKpiEdit?.();
      },
      steps: [
        {
          id: 'dashboard-kpi-edit-toolbar',
          title: 'Save or cancel',
          description:
            'Save KPIs applies your changes for everyone. Cancel discards edits and restores the previous layout.',
          side: 'bottom',
        },
        {
          id: 'dashboard-kpi-edit-hint',
          title: 'Reorder metrics',
          description:
            'Drag cards using the handle on each tile to reorder. The left-to-right order is what appears on the dashboard.',
          side: 'bottom',
        },
        {
          id: 'dashboard-kpi-drag-handle',
          title: 'Drag handle',
          description: 'Grab this handle to drag a KPI card to a new position in the row.',
          side: 'right',
          when: () => tourElementExists('dashboard-kpi-drag-handle'),
        },
        {
          id: 'dashboard-kpi-grid',
          title: 'Change a metric',
          description:
            'In edit mode, tap any KPI card to swap it for a different metric (e.g. swap Late for Half-day).',
          side: 'bottom',
        },
      ],
    },
    {
      id: 'charts',
      steps: [
        {
          id: 'dashboard-bar-chart',
          title: 'Weekly trend',
          description:
            'Bar chart shows the last 7 days for the active KPI filter. Click a bar to change the selected day.',
          side: 'top',
        },
        {
          id: 'dashboard-donut-chart',
          title: 'Day breakdown',
          description:
            'Donut chart breaks the selected day into on-time, late, and absent. Click segments to filter the table.',
          side: 'top',
        },
      ],
    },
    {
      id: 'layout-edit-intro',
      steps: [
        {
          id: 'dashboard-layout-edit',
          title: 'Edit layout',
          description:
            'Rearrange charts and the attendance table. Press Next to enter layout edit mode, or click the button.',
          side: 'bottom',
          allowInteraction: true,
          onLeaveForward: async (ctx) => {
            ctx.pageApi.enterLayoutEdit?.();
            await ctx.waitForSelector('dashboard-layout-guide', 2500);
          },
        },
      ],
    },
    {
      id: 'layout-edit',
      onExit: async (ctx) => {
        ctx.pageApi.cancelLayoutEdit?.();
      },
      steps: [
        {
          id: 'dashboard-layout-toolbar',
          title: 'Layout save bar',
          description: 'Save applies the new arrangement. Cancel reverts to your last saved layout.',
          side: 'bottom',
        },
        {
          id: 'dashboard-layout-guide',
          title: 'Layout presets',
          description:
            'Choose Charts on top or Table on top. Pick which chart(s) show on phones and tablets under 1024px.',
          side: 'bottom',
        },
        {
          id: 'dashboard-layout-blocks',
          title: 'Drag blocks',
          description:
            'Drag bar ↔ donut to swap charts. Drag the table onto a chart row to move it above or below the charts.',
          side: 'top',
        },
      ],
    },
    {
      id: 'table',
      steps: [
        {
          id: 'dashboard-attendance-table',
          title: 'Attendance table',
          description:
            'Search employees, filter by status or shift, and review punch times for the selected day. Updates when you click KPIs or charts.',
          side: 'top',
        },
      ],
    },
  ],
};
