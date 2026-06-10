import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DashboardLayoutSchema,
  DEFAULT_DASHBOARD_LAYOUT,
  migrateDashboardLayout,
  normalizeToStrictLayout,
  orderToRows,
} from '@mams/types';

const findById = vi.fn();
const findByIdAndUpdate = vi.fn();

vi.mock('../src/models/User.js', () => ({
  UserModel: {
    findById: (...args: unknown[]) => ({
      select: () => ({
        lean: () => findById(...args),
      }),
    }),
    findByIdAndUpdate: (...args: unknown[]) => findByIdAndUpdate(...args),
  },
}));

const { getDashboardLayout, saveDashboardLayout } = await import(
  '../src/services/dashboardLayout.service.js'
);

describe('DashboardLayoutSchema', () => {
  it('accepts all four strict layouts', () => {
    expect(
      DashboardLayoutSchema.parse({
        rows: [{ items: ['bar', 'donut'] }, { items: ['table'] }],
      })
    ).toEqual(DEFAULT_DASHBOARD_LAYOUT);
    expect(
      DashboardLayoutSchema.parse({
        rows: [{ items: ['donut', 'bar'] }, { items: ['table'] }],
      })
    ).toEqual({
      rows: [{ items: ['donut', 'bar'] }, { items: ['table'] }],
      mobileChart: 'both',
    });
    expect(
      DashboardLayoutSchema.parse({
        rows: [{ items: ['table'] }, { items: ['bar', 'donut'] }],
      })
    ).toEqual({
      rows: [{ items: ['table'] }, { items: ['bar', 'donut'] }],
      mobileChart: 'both',
    });
    expect(
      DashboardLayoutSchema.parse({
        rows: [{ items: ['table'] }, { items: ['donut', 'bar'] }],
      })
    ).toEqual({
      rows: [{ items: ['table'] }, { items: ['donut', 'bar'] }],
      mobileChart: 'both',
    });
  });

  it('accepts mobileChart preference', () => {
    expect(
      DashboardLayoutSchema.parse({
        rows: [{ items: ['bar', 'donut'] }, { items: ['table'] }],
        mobileChart: 'bar',
      })
    ).toEqual({
      rows: [{ items: ['bar', 'donut'] }, { items: ['table'] }],
      mobileChart: 'bar',
    });
  });

  it('rejects sideways table pairing', () => {
    expect(() =>
      DashboardLayoutSchema.parse({
        rows: [{ items: ['bar', 'table'] }, { items: ['donut'] }],
      })
    ).toThrow();
  });

  it('rejects three stacked rows', () => {
    expect(() =>
      DashboardLayoutSchema.parse({
        rows: [{ items: ['bar'] }, { items: ['table'] }, { items: ['donut'] }],
      })
    ).toThrow();
  });

  it('rejects duplicate block ids', () => {
    expect(() =>
      DashboardLayoutSchema.parse({
        rows: [{ items: ['bar', 'bar'] }, { items: ['table'] }],
      })
    ).toThrow();
  });
});

describe('normalizeToStrictLayout', () => {
  it('normalizes invalid saved rows', () => {
    expect(
      normalizeToStrictLayout([
        { items: ['donut', 'table'] },
        { items: ['bar'] },
      ]).rows
    ).toEqual([{ items: ['donut', 'bar'] }, { items: ['table'] }]);
  });
});

describe('orderToRows', () => {
  it('migrates default order to default rows', () => {
    expect(orderToRows(['bar', 'donut', 'table'])).toEqual(DEFAULT_DASHBOARD_LAYOUT.rows);
  });
});

describe('migrateDashboardLayout', () => {
  it('normalizes invalid rows on read', () => {
    expect(
      migrateDashboardLayout({ rows: [{ items: ['bar', 'table'] }, { items: ['donut'] }] })
    ).toEqual(DEFAULT_DASHBOARD_LAYOUT);
  });

  it('preserves mobileChart when migrating loose rows', () => {
    expect(
      migrateDashboardLayout({
        rows: [{ items: ['bar', 'donut'] }, { items: ['table'] }],
        mobileChart: 'donut',
      })
    ).toEqual({
      rows: [{ items: ['bar', 'donut'] }, { items: ['table'] }],
      mobileChart: 'donut',
    });
  });
});

describe('dashboardLayout.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns default when user has no layout', async () => {
    findById.mockResolvedValue({ dashboardLayout: undefined });
    const result = await getDashboardLayout('user1');
    expect(result).toEqual(DEFAULT_DASHBOARD_LAYOUT);
  });

  it('returns saved strict rows layout', async () => {
    findById.mockResolvedValue({
      dashboardLayout: {
        rows: [{ items: ['table'] }, { items: ['bar', 'donut'] }],
      },
    });
    const result = await getDashboardLayout('user1');
    expect(result).toEqual({
      rows: [{ items: ['table'] }, { items: ['bar', 'donut'] }],
      mobileChart: 'both',
    });
  });

  it('returns saved mobileChart preference', async () => {
    findById.mockResolvedValue({
      dashboardLayout: {
        rows: [{ items: ['bar', 'donut'] }, { items: ['table'] }],
        mobileChart: 'bar',
      },
    });
    const result = await getDashboardLayout('user1');
    expect(result).toEqual({
      rows: [{ items: ['bar', 'donut'] }, { items: ['table'] }],
      mobileChart: 'bar',
    });
  });

  it('normalizes invalid saved rows on read', async () => {
    findById.mockResolvedValue({
      dashboardLayout: {
        rows: [{ items: ['bar', 'table'] }, { items: ['donut'] }],
      },
    });
    const result = await getDashboardLayout('user1');
    expect(result).toEqual(DEFAULT_DASHBOARD_LAYOUT);
  });

  it('migrates legacy order layout on read', async () => {
    findById.mockResolvedValue({
      dashboardLayout: { order: ['table', 'bar', 'donut'] },
    });
    const result = await getDashboardLayout('user1');
    expect(result).toEqual({
      rows: [{ items: ['table'] }, { items: ['bar', 'donut'] }],
      mobileChart: 'both',
    });
  });

  it('saveDashboardLayout persists validated layout', async () => {
    findByIdAndUpdate.mockResolvedValue({});
    const layout = {
      rows: [{ items: ['donut', 'bar'] as const }, { items: ['table'] as const }],
      mobileChart: 'bar' as const,
    };
    const result = await saveDashboardLayout('user1', layout);
    expect(result).toEqual({
      rows: [{ items: ['donut', 'bar'] }, { items: ['table'] }],
      mobileChart: 'bar',
    });
    expect(findByIdAndUpdate).toHaveBeenCalledWith('user1', {
      dashboardLayout: {
        rows: [{ items: ['donut', 'bar'] }, { items: ['table'] }],
        mobileChart: 'bar',
      },
    });
  });
});
