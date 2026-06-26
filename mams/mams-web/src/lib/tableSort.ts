import { useMemo, useState, useCallback } from 'react';

export type SortDir = 'asc' | 'desc';
export type SortColumnType = 'string' | 'number' | 'date';

export function compareValues(
  a: unknown,
  b: unknown,
  dir: SortDir,
  type: SortColumnType = 'string'
): number {
  if (a == null && b == null) return 0;
  if (a == null) return dir === 'asc' ? 1 : -1;
  if (b == null) return dir === 'asc' ? -1 : 1;

  if (type === 'number') {
    const na = typeof a === 'number' ? a : Number(a);
    const nb = typeof b === 'number' ? b : Number(b);
    if (!Number.isFinite(na) && !Number.isFinite(nb)) return 0;
    if (!Number.isFinite(na)) return 1;
    if (!Number.isFinite(nb)) return -1;
    return dir === 'asc' ? na - nb : nb - na;
  }

  if (type === 'date') {
    const ta = new Date(String(a)).getTime();
    const tb = new Date(String(b)).getTime();
    if (!Number.isFinite(ta) && !Number.isFinite(tb)) return 0;
    if (!Number.isFinite(ta)) return 1;
    if (!Number.isFinite(tb)) return -1;
    return dir === 'asc' ? ta - tb : tb - ta;
  }

  const sa = String(a);
  const sb = String(b);
  return dir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
}

export function sortArrowFor(col: string | null, activeCol: string | null, dir: SortDir): string {
  if (col !== activeCol) return '▴';
  return dir === 'asc' ? '▲' : '▼';
}

export function useTableSort<T>(
  rows: T[],
  getValue: (row: T, col: string) => unknown,
  columnTypes: Record<string, SortColumnType> = {},
  defaultCol?: string | null
) {
  const [sortCol, setSortCol] = useState<string | null>(defaultCol ?? null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = useCallback((col: string) => {
    setSortCol((prev) => {
      if (prev === col) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return col;
      }
      setSortDir('asc');
      return col;
    });
  }, []);

  const sortArrow = useCallback(
    (col: string) => sortArrowFor(col, sortCol, sortDir),
    [sortCol, sortDir]
  );

  const sortedRows = useMemo(() => {
    if (!sortCol) return rows;
    const type = columnTypes[sortCol] ?? 'string';
    return [...rows].sort((a, b) => compareValues(getValue(a, sortCol), getValue(b, sortCol), sortDir, type));
  }, [rows, sortCol, sortDir, getValue, columnTypes]);

  return { sortCol, sortDir, setSortCol, setSortDir, toggleSort, sortArrow, sortedRows };
}
