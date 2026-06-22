import { describe, it, expect } from 'vitest';
import { METRICS_BY_CHART_TYPE } from '@mams/types';
import {
  ALL_CHART_TYPES,
  canAccessMetric,
  getAllMetricChartPairs,
  getMetricsForChartType,
} from './adminOverviewChartRegistry';

const orgAdminPerms = [
  'read.system_health',
  'manage.org_users',
  'read.org_audit',
  'read.real',
  'read.compliant',
  'manage.employees',
] as const;

describe('adminOverviewChartRegistry', () => {
  it('defines 7 chart types', () => {
    expect(ALL_CHART_TYPES).toHaveLength(7);
  });

  it('pie shares the same metrics as donut', () => {
    expect(METRICS_BY_CHART_TYPE.pie).toEqual(METRICS_BY_CHART_TYPE.donut);
  });

  it('each chart type has at least 3 metrics in catalog', () => {
    for (const type of ALL_CHART_TYPES) {
      expect(METRICS_BY_CHART_TYPE[type].length).toBeGreaterThanOrEqual(3);
    }
  });

  it('org admin sees 5+ metrics for line and bar', () => {
    const perms = [...orgAdminPerms];
    expect(getMetricsForChartType('line', perms).length).toBeGreaterThanOrEqual(5);
    expect(getMetricsForChartType('bar', perms).length).toBeGreaterThanOrEqual(5);
  });

  it('devices_online is accessible without extra permissions', () => {
    expect(canAccessMetric('devices_online', [])).toBe(true);
  });

  it('getAllMetricChartPairs lists every chart type + metric combo', () => {
    const perms = [...orgAdminPerms];
    const pairs = getAllMetricChartPairs(perms);
    const expected = ALL_CHART_TYPES.reduce(
      (sum, type) => sum + getMetricsForChartType(type, perms).length,
      0
    );
    expect(pairs).toHaveLength(expected);
    expect(pairs.some((p) => p.chartType === 'bar' && p.metricId === 'present')).toBe(true);
    expect(pairs.some((p) => p.chartType === 'donut' && p.metricId === 'attendance_punctuality')).toBe(true);
  });
});
