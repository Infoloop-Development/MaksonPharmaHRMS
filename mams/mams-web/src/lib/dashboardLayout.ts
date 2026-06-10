import { arrayMove } from '@dnd-kit/sortable';
import type {
  DashboardBlockId,
  DashboardLayout,
  DashboardLayoutRow,
  DashboardMobileChart,
  TablePosition,
} from '@mams/types';
import {
  DashboardLayoutSchema,
  getChartsRow,
  getTablePosition,
  isStrictDashboardLayout,
  normalizeToStrictLayout,
} from '@mams/types';

export type { DashboardLayoutRow, TablePosition };

export function layoutEquals(a: DashboardLayout, b: DashboardLayout): boolean {
  if ((a.mobileChart ?? 'both') !== (b.mobileChart ?? 'both')) return false;
  if (a.rows.length !== b.rows.length) return false;
  return a.rows.every((row, i) => {
    const other = b.rows[i];
    if (!other || row.items.length !== other.items.length) return false;
    return row.items.every((id, j) => id === other.items[j]);
  });
}

export function mobileChartVisibilityClass(
  blockId: 'bar' | 'donut',
  mobileChart: DashboardMobileChart,
  isEditing = false
): string {
  const classes: string[] = [];
  if (mobileChart === 'bar' && blockId === 'donut') {
    classes.push('max-lg:hidden');
  }
  if (mobileChart === 'donut' && blockId === 'bar') {
    classes.push('max-lg:hidden');
  }
  if (isEditing && mobileChart !== 'both') {
    const hiddenOnMobile =
      (mobileChart === 'bar' && blockId === 'donut') ||
      (mobileChart === 'donut' && blockId === 'bar');
    if (hiddenOnMobile) {
      classes.push('dash-layout-chart--hidden-mobile');
    }
  }
  return classes.join(' ');
}

export function normalizeLayout(layout: DashboardLayout): DashboardLayout {
  return DashboardLayoutSchema.parse(layout);
}

export function cloneLayoutRows(rows: DashboardLayoutRow[]): DashboardLayoutRow[] {
  return rows.map((r) => ({ items: [...r.items] }));
}

export function isChartBlock(id: DashboardBlockId): boolean {
  return id === 'bar' || id === 'donut';
}

export function swapChartsInLayout(rows: DashboardLayoutRow[]): DashboardLayoutRow[] | null {
  if (!isStrictDashboardLayout({ rows })) return null;
  const next = cloneLayoutRows(rows);
  const chartsRow = next.find((r) => r.items.includes('bar') && r.items.includes('donut'));
  if (!chartsRow || chartsRow.items.length !== 2) return null;
  chartsRow.items = arrayMove(chartsRow.items, 0, 1);
  return next;
}

export function flipTablePosition(rows: DashboardLayoutRow[]): DashboardLayoutRow[] | null {
  if (!isStrictDashboardLayout({ rows })) return null;
  return [...rows].reverse().map((r) => ({ items: [...r.items] }));
}

export function setTablePosition(
  rows: DashboardLayoutRow[],
  position: TablePosition
): DashboardLayoutRow[] {
  const charts = getChartsRow(rows);
  const tableRow: DashboardLayoutRow = { items: ['table'] };
  return position === 'top'
    ? [tableRow, { items: [...charts.items] }]
    : [{ items: [...charts.items] }, tableRow];
}

/** Strict drag: swap charts in charts row, or flip table top/bottom. */
export function dragOverLayoutRows(
  rows: DashboardLayoutRow[],
  activeId: DashboardBlockId,
  overId: DashboardBlockId
): DashboardLayoutRow[] | null {
  if (activeId === overId) return null;
  if (!isStrictDashboardLayout({ rows })) {
    return normalizeToStrictLayout(rows).rows;
  }

  const activeIsChart = isChartBlock(activeId);
  const overIsChart = isChartBlock(overId);
  const activeIsTable = activeId === 'table';
  const overIsTable = overId === 'table';

  if (activeIsChart && overIsChart) {
    const chartsRow = rows.find((r) => r.items.includes('bar') && r.items.includes('donut'));
    if (!chartsRow) return null;
    const activeIndex = chartsRow.items.indexOf(activeId);
    const overIndex = chartsRow.items.indexOf(overId);
    if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return null;
    return swapChartsInLayout(rows);
  }

  if ((activeIsTable && overIsChart) || (activeIsChart && overIsTable)) {
    const tablePos = getTablePosition(rows);
    const wouldFlip =
      (activeIsTable && tablePos === 'bottom') || (activeIsChart && tablePos === 'top');
    if (!wouldFlip) return null;
    return flipTablePosition(rows);
  }

  if (activeIsTable && overIsTable) return null;

  return null;
}

export const DASHBOARD_BLOCK_LABELS: Record<DashboardBlockId, string> = {
  bar: 'Weekly trend chart',
  donut: 'Day breakdown chart',
  table: 'Attendance table',
};

export { getTablePosition, getChartsRow, normalizeToStrictLayout, isStrictDashboardLayout };
