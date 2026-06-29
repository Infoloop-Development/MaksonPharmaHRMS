export type SortDir = 'asc' | 'desc';

export type SortFieldMap = Record<string, string>;

/**
 * Build a MongoDB sort object from whitelisted query params.
 * `fieldMap` maps API sortBy keys to Mongo field paths.
 */
export function parseSortQuery(
  sortBy: string | undefined,
  sortDir: string | undefined,
  fieldMap: SortFieldMap,
  defaultSort: Record<string, 1 | -1> = {}
): Record<string, 1 | -1> {
  if (!sortBy || !(sortBy in fieldMap)) {
    return defaultSort;
  }
  const dir: 1 | -1 = sortDir === 'desc' ? -1 : 1;
  return { [fieldMap[sortBy]!]: dir };
}
