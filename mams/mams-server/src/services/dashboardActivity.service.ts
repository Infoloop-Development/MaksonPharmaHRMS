import { getTablePosition, type DashboardKpiConfig, type DashboardLayout } from '@mams/types';

export function dashboardLayoutChangedFields(
  before: DashboardLayout,
  after: DashboardLayout
): string[] {
  const fields: string[] = [];
  if (JSON.stringify(before.rows) !== JSON.stringify(after.rows)) fields.push('rows');
  if ((before.mobileChart ?? 'both') !== (after.mobileChart ?? 'both')) fields.push('mobileChart');
  return fields;
}

export function dashboardLayoutAuditPayload(before: DashboardLayout, after: DashboardLayout) {
  return {
    changedFields: dashboardLayoutChangedFields(before, after),
    mobileChart: after.mobileChart ?? 'both',
    mobileChartBefore: before.mobileChart ?? 'both',
    tablePosition: getTablePosition(after.rows),
  };
}

export function dashboardKpiChanged(before: DashboardKpiConfig, after: DashboardKpiConfig): boolean {
  return before.slots.some((s, i) => s !== after.slots[i]);
}

export function dashboardKpiAuditPayload(before: DashboardKpiConfig, after: DashboardKpiConfig) {
  return {
    slots: before.slots,
    slotsAfter: after.slots,
  };
}
