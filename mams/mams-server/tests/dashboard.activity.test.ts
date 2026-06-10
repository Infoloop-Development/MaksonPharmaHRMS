import { describe, it, expect } from 'vitest';
import { DEFAULT_DASHBOARD_KPI, DEFAULT_DASHBOARD_LAYOUT } from '@mams/types';
import {
  dashboardKpiAuditPayload,
  dashboardKpiChanged,
  dashboardLayoutAuditPayload,
  dashboardLayoutChangedFields,
} from '../src/services/dashboardActivity.service.js';

describe('dashboardLayoutChangedFields', () => {
  it('detects mobileChart change', () => {
    const before = { ...DEFAULT_DASHBOARD_LAYOUT };
    const after = { ...DEFAULT_DASHBOARD_LAYOUT, mobileChart: 'bar' as const };
    expect(dashboardLayoutChangedFields(before, after)).toEqual(['mobileChart']);
  });

  it('detects rows change', () => {
    const before = { ...DEFAULT_DASHBOARD_LAYOUT };
    const after = {
      ...DEFAULT_DASHBOARD_LAYOUT,
      rows: [{ items: ['table'] as const }, { items: ['bar', 'donut'] as const }],
    };
    expect(dashboardLayoutChangedFields(before, after)).toEqual(['rows']);
  });

  it('builds audit payload with table position', () => {
    const after = {
      ...DEFAULT_DASHBOARD_LAYOUT,
      mobileChart: 'donut' as const,
    };
    const payload = dashboardLayoutAuditPayload(DEFAULT_DASHBOARD_LAYOUT, after);
    expect(payload.tablePosition).toBe('bottom');
    expect(payload.mobileChart).toBe('donut');
    expect(payload.changedFields).toContain('mobileChart');
  });
});

describe('dashboardKpiChanged', () => {
  it('returns true when slots differ', () => {
    const after = {
      slots: ['present', 'absent', 'late', 'weeklyOff'] as const,
    };
    expect(dashboardKpiChanged(DEFAULT_DASHBOARD_KPI, after)).toBe(true);
  });

  it('builds audit payload', () => {
    const after = {
      slots: ['present', 'absent', 'late', 'weeklyOff'] as const,
    };
    expect(dashboardKpiAuditPayload(DEFAULT_DASHBOARD_KPI, after)).toEqual({
      slots: DEFAULT_DASHBOARD_KPI.slots,
      slotsAfter: after.slots,
    });
  });
});
