import { describe, it, expect } from 'vitest';
import { migrateDashboardLayout, DEFAULT_DASHBOARD_LAYOUT } from '@mams/types';
import { adminOverviewLayoutChangedFields } from '../src/services/adminOverviewActivity.service.js';

describe('adminOverview layout migration', () => {
  it('migrates legacy order to strict layout', () => {
    const migrated = migrateDashboardLayout({
      order: ['table', 'bar', 'donut'],
    });
    expect(migrated.rows[0]?.items).toEqual(['table']);
    expect(migrated.rows[1]?.items.sort()).toEqual(['bar', 'donut'].sort());
  });

  it('returns default for invalid input', () => {
    expect(migrateDashboardLayout({ rows: [] })).toEqual(DEFAULT_DASHBOARD_LAYOUT);
  });
});

describe('adminOverviewLayoutChangedFields', () => {
  it('detects row changes', () => {
    const before = DEFAULT_DASHBOARD_LAYOUT;
    const after = {
      rows: [{ items: ['table'] as const }, { items: ['bar', 'donut'] as const }],
      mobileChart: 'both' as const,
    };
    expect(adminOverviewLayoutChangedFields(before, after)).toContain('rows');
  });
});
