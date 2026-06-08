import { z } from 'zod';

export const DashboardBlockIdSchema = z.enum(['bar', 'donut', 'table']);
export type DashboardBlockId = z.infer<typeof DashboardBlockIdSchema>;

const ALL_BLOCK_IDS: DashboardBlockId[] = ['bar', 'donut', 'table'];
const CHART_IDS: DashboardBlockId[] = ['bar', 'donut'];

export const DashboardLayoutRowSchema = z.object({
  items: z.array(DashboardBlockIdSchema).min(1).max(2),
});

export type DashboardLayoutRow = z.infer<typeof DashboardLayoutRowSchema>;

function isChartsPair(items: DashboardBlockId[]): boolean {
  return items.length === 2 && items.includes('bar') && items.includes('donut');
}

function isTableSolo(items: DashboardBlockId[]): boolean {
  return items.length === 1 && items[0] === 'table';
}

/** Exactly 2 rows: charts pair + table solo (either order). */
export function isStrictDashboardLayout(layout: { rows: DashboardLayoutRow[] }): boolean {
  if (layout.rows.length !== 2) return false;
  const [a, b] = layout.rows;
  if (!a || !b) return false;
  return (
    (isChartsPair(a.items) && isTableSolo(b.items)) ||
    (isTableSolo(a.items) && isChartsPair(b.items))
  );
}

export const DashboardLayoutSchema = z
  .object({
    rows: z.array(DashboardLayoutRowSchema).length(2),
  })
  .refine(
    (layout) => {
      const flat = layout.rows.flatMap((r) => r.items);
      if (flat.length !== 3) return false;
      const set = new Set(flat);
      return set.size === 3 && ALL_BLOCK_IDS.every((id) => set.has(id));
    },
    { message: 'rows must contain each block exactly once' }
  )
  .refine((layout) => isStrictDashboardLayout(layout), {
    message: 'layout must be charts row + full-width table row (either order)',
  });

export type DashboardLayout = z.infer<typeof DashboardLayoutSchema>;

/** @deprecated Legacy flat order — use orderToRows() to migrate. */
export const DEFAULT_DASHBOARD_LAYOUT_ORDER: DashboardBlockId[] = ['bar', 'donut', 'table'];

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  rows: [{ items: ['bar', 'donut'] }, { items: ['table'] }],
};

export type TablePosition = 'top' | 'bottom';

export function getTablePosition(rows: DashboardLayoutRow[]): TablePosition {
  const idx = rows.findIndex((r) => r.items.length === 1 && r.items[0] === 'table');
  return idx === 0 ? 'top' : 'bottom';
}

export function getChartsRow(rows: DashboardLayoutRow[]): DashboardLayoutRow {
  const row = rows.find((r) => r.items.includes('bar') && r.items.includes('donut'));
  return row ?? { items: ['bar', 'donut'] };
}

/** Snap any row structure to strict charts+table layout. */
export function normalizeToStrictLayout(
  rows: DashboardLayoutRow[],
  options?: { tableOnTop?: boolean }
): DashboardLayout {
  const flat = rows.flatMap((r) => r.items);
  const barIdx = flat.indexOf('bar');
  const donutIdx = flat.indexOf('donut');
  const chartOrder: [DashboardBlockId, DashboardBlockId] =
    barIdx >= 0 && donutIdx >= 0 && barIdx < donutIdx
      ? ['bar', 'donut']
      : ['donut', 'bar'];

  let tableOnTop = options?.tableOnTop;
  if (tableOnTop === undefined) {
    const soloTableRowIdx = rows.findIndex(
      (r) => r.items.length === 1 && r.items[0] === 'table'
    );
    if (soloTableRowIdx >= 0) {
      tableOnTop = soloTableRowIdx === 0;
    } else {
      tableOnTop = flat.indexOf('table') === 0;
    }
  }

  const chartsRow: DashboardLayoutRow = { items: [...chartOrder] };
  const tableRow: DashboardLayoutRow = { items: ['table'] };

  const normalized: DashboardLayout = tableOnTop
    ? { rows: [tableRow, chartsRow] }
    : { rows: [chartsRow, tableRow] };

  return DashboardLayoutSchema.parse(normalized);
}

/** Convert legacy order to rows, then normalize to strict layout. */
export function orderToRows(order: DashboardBlockId[]): DashboardLayoutRow[] {
  const tableIdx = order.indexOf('table');
  const tableOnTop = tableIdx === 0;
  const barIdx = order.indexOf('bar');
  const donutIdx = order.indexOf('donut');
  const chartOrder: [DashboardBlockId, DashboardBlockId] =
    barIdx >= 0 && donutIdx >= 0 && barIdx < donutIdx ? ['bar', 'donut'] : ['donut', 'bar'];

  return tableOnTop
    ? [{ items: ['table'] }, { items: chartOrder }]
    : [{ items: chartOrder }, { items: ['table'] }];
}

const LegacyOrderLayoutSchema = z.object({
  order: z
    .array(DashboardBlockIdSchema)
    .length(3)
    .refine((order) => new Set(order).size === 3, {
      message: 'order must contain each block exactly once',
    }),
});

const LooseRowsLayoutSchema = z.object({
  rows: z.array(DashboardLayoutRowSchema).min(1).max(3),
});

export function migrateDashboardLayout(input: unknown): DashboardLayout {
  const strict = DashboardLayoutSchema.safeParse(input);
  if (strict.success) return strict.data;

  const loose = LooseRowsLayoutSchema.safeParse(input);
  if (loose.success) {
    const flat = loose.data.rows.flatMap((r) => r.items);
    if (flat.length === 3 && new Set(flat).size === 3) {
      return normalizeToStrictLayout(loose.data.rows);
    }
  }

  const legacy = LegacyOrderLayoutSchema.safeParse(input);
  if (legacy.success) {
    return normalizeToStrictLayout(orderToRows(legacy.data.order));
  }

  return DEFAULT_DASHBOARD_LAYOUT;
}
