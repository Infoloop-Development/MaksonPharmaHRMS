import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AdminOverviewWidgetsConfigSchema,
  DEFAULT_ADMIN_OVERVIEW_WIDGETS,
  migrateAdminOverviewWidgets,
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

const { getAdminOverviewWidgets, saveAdminOverviewWidgets } = await import(
  '../src/services/adminOverviewWidget.service.js'
);

describe('AdminOverviewWidgetsConfigSchema', () => {
  it('accepts 2–8 widgets', () => {
    expect(AdminOverviewWidgetsConfigSchema.parse(DEFAULT_ADMIN_OVERVIEW_WIDGETS)).toEqual(
      DEFAULT_ADMIN_OVERVIEW_WIDGETS
    );
  });

  it('rejects fewer than 2 widgets', () => {
    expect(() =>
      AdminOverviewWidgetsConfigSchema.parse({
        widgets: [{ id: 'w1', chartType: 'line', metricId: 'present' }],
        tablePosition: 'bottom',
        showTable: true,
      })
    ).toThrow();
  });

  it('rejects more than 8 widgets', () => {
    const widgets = Array.from({ length: 9 }, (_, i) => ({
      id: `w${i}`,
      chartType: 'bar' as const,
      metricId: 'present' as const,
    }));
    expect(() =>
      AdminOverviewWidgetsConfigSchema.parse({ widgets, tablePosition: 'bottom', showTable: true })
    ).toThrow();
  });

  it('rejects invalid metric for chart type', () => {
    expect(() =>
      AdminOverviewWidgetsConfigSchema.parse({
        widgets: [
          { id: 'w1', chartType: 'donut', metricId: 'present' },
          { id: 'w2', chartType: 'line', metricId: 'present' },
        ],
        tablePosition: 'bottom',
        showTable: true,
      })
    ).toThrow(/not allowed/i);
  });

  it('accepts pie chart type with donut metrics', () => {
    const config = AdminOverviewWidgetsConfigSchema.parse({
      widgets: [
        { id: 'w1', chartType: 'pie', metricId: 'attendance_punctuality' },
        { id: 'w2', chartType: 'line', metricId: 'present' },
      ],
      tablePosition: 'bottom',
      showTable: true,
    });
    expect(config.widgets[0]?.chartType).toBe('pie');
  });

  it('accepts 8 widgets', () => {
    const widgets = Array.from({ length: 8 }, (_, i) => ({
      id: `w${i}`,
      chartType: 'bar' as const,
      metricId: 'present' as const,
    }));
    expect(AdminOverviewWidgetsConfigSchema.parse({ widgets, tablePosition: 'bottom', showTable: true }).widgets).toHaveLength(8);
  });
});

describe('migrateAdminOverviewWidgets', () => {
  it('migrates legacy layout to default widgets', () => {
    const migrated = migrateAdminOverviewWidgets({
      rows: [{ items: ['bar', 'donut'] }, { items: ['table'] }],
    });
    expect(migrated.widgets).toHaveLength(2);
  });
});

describe('adminOverviewWidget.service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns default when user has no config', async () => {
    findById.mockResolvedValue(null);
    await expect(getAdminOverviewWidgets('u1')).resolves.toEqual(DEFAULT_ADMIN_OVERVIEW_WIDGETS);
  });

  it('saves validated config', async () => {
    findByIdAndUpdate.mockResolvedValue({});
    const config = {
      widgets: [
        { id: 'w1', chartType: 'area' as const, metricId: 'audit_events' as const },
        { id: 'w2', chartType: 'stacked_bar' as const, metricId: 'attendance_status' as const },
      ],
      tablePosition: 'bottom' as const,
      showTable: true,
    };
    await expect(saveAdminOverviewWidgets('u1', config)).resolves.toEqual(config);
  });
});
