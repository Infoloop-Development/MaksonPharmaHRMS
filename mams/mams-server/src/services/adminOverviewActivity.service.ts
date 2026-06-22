import { getTablePosition, type AdminOverviewKpiConfig, type AdminOverviewTableConfig, type DashboardLayout } from '@mams/types';

export function adminOverviewLayoutChangedFields(
  before: DashboardLayout,
  after: DashboardLayout
): string[] {
  const fields: string[] = [];
  if (JSON.stringify(before.rows) !== JSON.stringify(after.rows)) fields.push('rows');
  if ((before.mobileChart ?? 'both') !== (after.mobileChart ?? 'both')) fields.push('mobileChart');
  return fields;
}

export function adminOverviewLayoutAuditPayload(before: DashboardLayout, after: DashboardLayout) {
  return {
    changedFields: adminOverviewLayoutChangedFields(before, after),
    mobileChart: after.mobileChart ?? 'both',
    mobileChartBefore: before.mobileChart ?? 'both',
    tablePosition: getTablePosition(after.rows),
  };
}

export function adminOverviewKpiChanged(
  before: AdminOverviewKpiConfig,
  after: AdminOverviewKpiConfig
): boolean {
  return before.slots.some((s, i) => s !== after.slots[i]);
}

export function adminOverviewKpiAuditPayload(
  before: AdminOverviewKpiConfig,
  after: AdminOverviewKpiConfig
) {
  return {
    slots: before.slots,
    slotsAfter: after.slots,
  };
}

export function adminOverviewTableChanged(
  before: AdminOverviewTableConfig,
  after: AdminOverviewTableConfig
): boolean {
  return (
    before.kind !== after.kind ||
    JSON.stringify(before.columns) !== JSON.stringify(after.columns)
  );
}

export function adminOverviewTableAuditPayload(
  before: AdminOverviewTableConfig,
  after: AdminOverviewTableConfig
) {
  return {
    kind: before.kind,
    kindAfter: after.kind,
    columns: before.columns,
    columnsAfter: after.columns,
  };
}

export function adminOverviewWidgetsChanged(
  before: { widgets: { id: string; chartType: string; metricId: string }[] },
  after: { widgets: { id: string; chartType: string; metricId: string }[] }
): boolean {
  return JSON.stringify(before.widgets) !== JSON.stringify(after.widgets);
}

export function adminOverviewWidgetsAuditPayload(
  before: { widgets: { chartType: string; metricId: string }[]; tablePosition?: string; showTable?: boolean },
  after: { widgets: { chartType: string; metricId: string }[]; tablePosition?: string; showTable?: boolean }
) {
  return {
    count: after.widgets.length,
    metrics: after.widgets.map((w) => `${w.chartType}:${w.metricId}`),
    countBefore: before.widgets.length,
    tablePosition: after.tablePosition,
    showTable: after.showTable,
  };
}
