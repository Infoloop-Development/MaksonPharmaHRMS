import { describe, it, expect } from 'vitest';
import {
  DEFAULT_DASHBOARD_LAYOUT,
  orderToRows,
  migrateDashboardLayout,
  isStrictDashboardLayout,
  normalizeToStrictLayout,
  type DashboardLayoutRow,
} from '@mams/types';
import {
  dragOverLayoutRows,
  flipTablePosition,
  layoutEquals,
  setTablePosition,
  swapChartsInLayout,
} from './dashboardLayout';

const rows = (...r: DashboardLayoutRow[]): DashboardLayoutRow[] => r;

describe('isStrictDashboardLayout', () => {
  it('accepts charts then table', () => {
    expect(isStrictDashboardLayout(DEFAULT_DASHBOARD_LAYOUT)).toBe(true);
  });

  it('accepts table then charts', () => {
    expect(
      isStrictDashboardLayout({ rows: [{ items: ['table'] }, { items: ['donut', 'bar'] }] })
    ).toBe(true);
  });

  it('rejects sideways table', () => {
    expect(
      isStrictDashboardLayout({ rows: [{ items: ['bar', 'table'] }, { items: ['donut'] }] })
    ).toBe(false);
  });

  it('rejects three stacked rows', () => {
    expect(
      isStrictDashboardLayout({
        rows: [{ items: ['bar'] }, { items: ['table'] }, { items: ['donut'] }],
      })
    ).toBe(false);
  });
});

describe('orderToRows', () => {
  it('produces strict charts then table', () => {
    expect(orderToRows(['bar', 'donut', 'table'])).toEqual(DEFAULT_DASHBOARD_LAYOUT.rows);
  });

  it('puts table first when leading in order', () => {
    expect(orderToRows(['table', 'bar', 'donut'])).toEqual([
      { items: ['table'] },
      { items: ['bar', 'donut'] },
    ]);
  });

  it('normalizes separated charts with table in middle', () => {
    expect(orderToRows(['bar', 'table', 'donut'])).toEqual(DEFAULT_DASHBOARD_LAYOUT.rows);
  });
});

describe('normalizeToStrictLayout', () => {
  it('merges invalid sideways layout', () => {
    expect(
      normalizeToStrictLayout(rows({ items: ['bar', 'table'] }, { items: ['donut'] })).rows
    ).toEqual(DEFAULT_DASHBOARD_LAYOUT.rows);
  });

  it('respects tableOnTop option', () => {
    expect(
      normalizeToStrictLayout(DEFAULT_DASHBOARD_LAYOUT.rows, { tableOnTop: true }).rows
    ).toEqual([{ items: ['table'] }, { items: ['bar', 'donut'] }]);
  });
});

describe('migrateDashboardLayout', () => {
  it('passes through strict rows', () => {
    const layout = { rows: [{ items: ['table'] as const }, { items: ['donut', 'bar'] as const }] };
    expect(migrateDashboardLayout(layout)).toEqual(layout);
  });

  it('normalizes invalid rows format', () => {
    expect(
      migrateDashboardLayout({ rows: [{ items: ['bar', 'table'] }, { items: ['donut'] }] })
    ).toEqual(DEFAULT_DASHBOARD_LAYOUT);
  });

  it('migrates legacy order format', () => {
    expect(migrateDashboardLayout({ order: ['bar', 'donut', 'table'] })).toEqual(
      DEFAULT_DASHBOARD_LAYOUT
    );
  });
});

describe('layoutEquals', () => {
  it('returns true for identical rows', () => {
    expect(layoutEquals(DEFAULT_DASHBOARD_LAYOUT, DEFAULT_DASHBOARD_LAYOUT)).toBe(true);
  });

  it('returns false when rows differ', () => {
    expect(
      layoutEquals(DEFAULT_DASHBOARD_LAYOUT, {
        rows: [{ items: ['table'] }, { items: ['bar', 'donut'] }],
      })
    ).toBe(false);
  });
});

describe('swapChartsInLayout', () => {
  it('swaps bar and donut', () => {
    expect(swapChartsInLayout(DEFAULT_DASHBOARD_LAYOUT.rows)).toEqual([
      { items: ['donut', 'bar'] },
      { items: ['table'] },
    ]);
  });
});

describe('flipTablePosition', () => {
  it('moves table to top', () => {
    expect(flipTablePosition(DEFAULT_DASHBOARD_LAYOUT.rows)).toEqual([
      { items: ['table'] },
      { items: ['bar', 'donut'] },
    ]);
  });
});

describe('setTablePosition', () => {
  it('sets table on top preset', () => {
    expect(setTablePosition(DEFAULT_DASHBOARD_LAYOUT.rows, 'top')).toEqual([
      { items: ['table'] },
      { items: ['bar', 'donut'] },
    ]);
  });
});

describe('dragOverLayoutRows', () => {
  it('swaps charts when bar dragged onto donut', () => {
    expect(
      dragOverLayoutRows(rows({ items: ['bar', 'donut'] }, { items: ['table'] }), 'bar', 'donut')
    ).toEqual(rows({ items: ['donut', 'bar'] }, { items: ['table'] }));
  });

  it('flips table to top when table dragged onto chart', () => {
    expect(
      dragOverLayoutRows(rows({ items: ['bar', 'donut'] }, { items: ['table'] }), 'table', 'bar')
    ).toEqual(rows({ items: ['table'] }, { items: ['bar', 'donut'] }));
  });

  it('rejects noop when table already on top and dragged onto chart', () => {
    expect(
      dragOverLayoutRows(rows({ items: ['table'] }, { items: ['bar', 'donut'] }), 'table', 'bar')
    ).toBeNull();
  });

  it('rejects invalid same-slot chart drag', () => {
    expect(
      dragOverLayoutRows(rows({ items: ['bar', 'donut'] }, { items: ['table'] }), 'bar', 'bar')
    ).toBeNull();
  });
});
