import type { TourActionMap, TourScript, TourRuntimeContext } from '../tourTypes';
import { tourElementExists } from '../tourDom';

export const ADMIN_OVERVIEW_TOUR_ACTIONS: TourActionMap = {
  'configure-opened': 'configure-intro',
};

const scrollTop = (ctx: TourRuntimeContext) => {
  ctx.pageApi.scrollToTop?.();
};

export const adminOverviewTourScript: TourScript = {
  onCleanup: async (ctx) => {
    ctx.pageApi.closeModals?.();
    ctx.pageApi.cancelConfigure?.();
    ctx.pageApi.resetView?.();
  },
  phases: [
    {
      id: 'overview',
      steps: [
        {
          id: 'admin-overview-header',
          title: 'Admin Overview',
          description:
            'Platform governance for your organization. This tour focuses on Configure overview — where you set KPIs, charts, and the data table for all admins.',
          side: 'bottom',
        },
        {
          id: 'admin-overview-kpi-grid',
          title: 'Live KPI tiles',
          description:
            'In view mode, click tiles to filter charts and the table. Next we open Configure overview to customize what appears here.',
          side: 'bottom',
        },
      ],
    },
    {
      id: 'configure-intro',
      steps: [
        {
          id: 'admin-overview-configure-btn',
          title: 'Open Configure overview',
          description:
            'This is the control centre for layout. Press Next to enter configure mode — the tour stays inside configure until we finish table setup.',
          side: 'left',
          allowInteraction: true,
          onEnter: scrollTop,
          when: () => tourElementExists('admin-overview-configure-btn'),
          onLeaveForward: async (ctx) => {
            ctx.pageApi.enterConfigureMode?.('charts');
            await ctx.waitForSelector('admin-overview-configure-toolbar', 3000);
          },
        },
        {
          id: 'admin-overview-configure-toolbar',
          title: 'Configure toolbar',
          description:
            'Three tabs — Edit KPIs, Edit charts, Edit table — plus Cancel and Save. Changes preview live; nothing is published until you Save.',
          side: 'bottom',
          dynamic: true,
        },
        {
          id: 'admin-overview-configure-shell',
          title: 'Inside configure mode',
          description:
            'While configuring, the page below this toolbar updates as a preview. Scroll is locked during the tour so you can follow step by step.',
          side: 'bottom',
          dynamic: true,
        },
        {
          id: 'admin-overview-tab-kpi',
          title: 'Edit KPIs tab',
          description: 'Press Next to switch to KPI configuration — the first of three configure areas.',
          side: 'bottom',
          dynamic: true,
          onLeaveForward: async (ctx) => {
            ctx.pageApi.enterConfigureMode?.('kpi');
            ctx.pageApi.scrollToTop?.();
            await ctx.waitForSelector('admin-overview-kpi-edit-toolbar', 3000);
          },
        },
      ],
    },
    {
      id: 'kpi-edit',
      onExit: async (ctx) => {
        ctx.pageApi.closeModals?.();
      },
      steps: [
        {
          id: 'admin-overview-tab-kpi',
          title: 'KPI tab active',
          description: 'The Edit KPIs tab is highlighted. You are customizing the four tiles at the top of the page.',
          side: 'bottom',
          dynamic: true,
          onEnter: scrollTop,
        },
        {
          id: 'admin-overview-kpi-edit-toolbar',
          title: 'Save or cancel KPIs',
          description:
            'Save KPIs applies metrics and order for everyone. Cancel (in the top toolbar) exits configure without saving.',
          side: 'bottom',
          dynamic: true,
        },
        {
          id: 'admin-overview-kpi-edit-hint',
          title: 'Reorder KPI cards',
          description: 'Drag cards by the handle. Left-to-right order is what all admins see.',
          side: 'bottom',
          dynamic: true,
        },
        {
          id: 'admin-kpi-drag-handle',
          title: 'Drag handle',
          description: 'Grab here to drag a KPI card to a new slot.',
          side: 'right',
          dynamic: true,
        },
        {
          id: 'admin-overview-kpi-grid',
          title: 'Change a metric',
          description: 'Tap any KPI card to swap its metric. Press Next to open the metric picker.',
          side: 'bottom',
          dynamic: true,
          onLeaveForward: async (ctx) => {
            ctx.pageApi.openKpiPicker?.();
            await ctx.waitForSelector('admin-kpi-picker-panel', 3000);
          },
        },
        {
          id: 'admin-kpi-picker-panel',
          title: 'KPI metric picker',
          description:
            'Pick from governance and HR metrics available to your role. Each of the four slots must use a different metric.',
          side: 'left',
          dynamic: true,
        },
        {
          id: 'admin-kpi-picker-options',
          title: 'Metric list',
          description:
            'Tap a row to assign it to this slot. Greyed options are already used or not permitted for your role.',
          side: 'left',
          dynamic: true,
          onLeaveForward: async (ctx) => {
            ctx.pageApi.closeModals?.();
            await ctx.waitForSelector('admin-overview-tab-charts', 2000);
          },
        },
      ],
    },
    {
      id: 'charts-edit',
      onExit: async (ctx) => {
        ctx.pageApi.closeModals?.();
      },
      steps: [
        {
          id: 'admin-overview-tab-charts',
          title: 'Edit charts tab',
          description: 'Press Next to switch to chart configuration.',
          side: 'bottom',
          dynamic: true,
          onEnter: scrollTop,
          onLeaveForward: async (ctx) => {
            ctx.pageApi.enterConfigureMode?.('charts');
            ctx.pageApi.scrollToTop?.();
            await ctx.waitForSelector('admin-overview-charts-layout', 3000);
          },
        },
        {
          id: 'admin-overview-charts-layout',
          title: 'Chart layout options',
          description:
            'Add charts (2–8 total), toggle Show data table, and set table above or below the chart grid.',
          side: 'bottom',
          dynamic: true,
        },
        {
          id: 'admin-overview-add-chart',
          title: 'Add chart',
          description: 'Adds a new chart slot and opens the chart picker.',
          side: 'top',
          dynamic: true,
        },
        {
          id: 'admin-overview-chart-grid',
          title: 'Chart grid',
          description:
            'In edit mode: drag to reorder, tap a card to edit, or Remove (minimum two charts).',
          side: 'top',
          dynamic: true,
        },
        {
          id: 'admin-chart-drag-handle',
          title: 'Chart drag handle',
          description: 'Drag to reorder charts in the grid.',
          side: 'right',
          dynamic: true,
        },
        {
          id: 'admin-overview-chart-edit-card',
          title: 'Edit a chart',
          description: 'Press Next to open the chart picker for this chart.',
          side: 'top',
          dynamic: true,
          onLeaveForward: async (ctx) => {
            ctx.pageApi.openWidgetPicker?.();
            await ctx.waitForSelector('admin-widget-picker-panel', 3000);
          },
        },
        {
          id: 'admin-widget-picker-panel',
          title: 'Chart picker',
          description: 'Choose chart type and metric, then Apply. Cancel keeps the previous chart.',
          side: 'left',
          dynamic: true,
        },
        {
          id: 'admin-widget-picker-types',
          title: 'Chart types',
          description:
            'Line, area, bar, stacked bar, pie, donut, or horizontal bar — or browse All combinations.',
          side: 'right',
          dynamic: true,
        },
        {
          id: 'admin-widget-picker-metrics',
          title: 'Chart metrics',
          description:
            'Metrics grouped by HR, Governance, Security, and Devices. Select one, then Apply.',
          side: 'left',
          dynamic: true,
          onLeaveForward: async (ctx) => {
            ctx.pageApi.closeModals?.();
            await ctx.waitForSelector('admin-overview-save-charts', 2000);
          },
        },
        {
          id: 'admin-overview-save-charts',
          title: 'Save charts',
          description:
            'When finished with charts and layout, click Save charts. The tour does not save for you.',
          side: 'bottom',
          dynamic: true,
        },
      ],
    },
    {
      id: 'table-edit',
      onExit: async (ctx) => {
        ctx.pageApi.closeModals?.();
      },
      steps: [
        {
          id: 'admin-overview-tab-table',
          title: 'Edit table tab',
          description: 'Press Next to configure the data table dataset and columns.',
          side: 'bottom',
          dynamic: true,
          onLeaveForward: async (ctx) => {
            ctx.pageApi.enterConfigureMode?.('table');
            ctx.pageApi.demoShowTable?.();
            ctx.pageApi.scrollToTable?.();
            await ctx.waitForSelector('admin-overview-table-edit', 4000);
          },
        },
        {
          id: 'admin-overview-table-edit',
          title: 'Table dataset',
          description:
            'Pick Attendance, Users, Audit log, Devices, or Employees — whichever your permissions allow.',
          side: 'bottom',
          dynamic: true,
        },
        {
          id: 'admin-table-kind',
          title: 'Dataset selector',
          description: 'Changing dataset resets columns to that dataset’s defaults. Preview updates below.',
          side: 'bottom',
          dynamic: true,
        },
        {
          id: 'admin-overview-choose-columns',
          title: 'Choose columns',
          description: 'Press Next to open the column picker.',
          side: 'bottom',
          dynamic: true,
          onLeaveForward: async (ctx) => {
            ctx.pageApi.openColumnPicker?.();
            await ctx.waitForSelector('admin-table-column-picker', 3000);
          },
        },
        {
          id: 'admin-table-column-picker',
          title: 'Column picker',
          description: 'Toggle columns on or off. At least one column must stay visible.',
          side: 'left',
          dynamic: true,
          onLeaveForward: async (ctx) => {
            ctx.pageApi.closeModals?.();
            await ctx.waitForSelector('admin-overview-save-table', 2000);
          },
        },
        {
          id: 'admin-overview-save-table',
          title: 'Save table',
          description:
            'Click Save table to publish dataset and column choices. Press Next to exit configure and return to view mode.',
          side: 'bottom',
          dynamic: true,
          onLeaveForward: async (ctx) => {
            ctx.pageApi.cancelConfigure?.();
            ctx.pageApi.scrollToTop?.();
            await ctx.waitForSelector('admin-overview-kpi-grid', 2000);
          },
        },
      ],
    },
    {
      id: 'view-features',
      onExit: async (ctx) => {
        ctx.pageApi.resetView?.();
      },
      steps: [
        {
          id: 'admin-overview-kpi-grid',
          title: 'Filter from KPIs',
          description: 'Back in view mode — press Next to apply a sample filter.',
          side: 'bottom',
          onLeaveForward: async (ctx) => {
            ctx.pageApi.demoKpiFilter?.();
            await ctx.waitForSelector('admin-overview-filter-bar', 2000);
          },
        },
        {
          id: 'admin-overview-filter-bar',
          title: 'Active filters',
          description: 'Shows date, status, and shift. Reset to default view clears filters.',
          side: 'bottom',
          when: () => tourElementExists('admin-overview-filter-bar'),
        },
        {
          id: 'admin-overview-first-chart',
          title: 'Chart day selection',
          description: 'On trend charts, click a day to change the active date for the whole page.',
          side: 'top',
          allowInteraction: true,
          when: () => tourElementExists('admin-overview-first-chart'),
        },
        {
          id: 'admin-overview-table',
          title: 'Data table',
          description: 'Reflects your saved configure settings plus any active filters.',
          side: 'top',
          when: () => tourElementExists('admin-overview-table'),
          onEnter: (ctx) => {
            ctx.pageApi.scrollToTable?.();
          },
        },
        {
          id: 'admin-overview-table-filters',
          title: 'Search, sort, export',
          description:
            'Search and filter rows, sort by column headers, and export Excel or PDF.',
          side: 'bottom',
          when: () => tourElementExists('admin-overview-table-filters'),
        },
      ],
    },
    {
      id: 'finish',
      steps: [
        {
          id: 'admin-overview-header',
          title: 'Tour complete',
          description:
            'Configure overview sets the org-wide layout; view filters are personal. Replay anytime from Give me a tour.',
          side: 'bottom',
          onEnter: scrollTop,
        },
      ],
    },
  ],
};
