/** Count how many filter values differ from their defaults (for mobile filter badge). */
export function countActiveFilters(
  values: Record<string, unknown>,
  defaults: Record<string, unknown> = {}
): number {
  let n = 0;
  for (const [key, val] of Object.entries(values)) {
    const def = defaults[key];
    const empty = val === '' || val === undefined || val === null;
    const isDefault = def !== undefined ? val === def : empty;
    if (!isDefault && !empty) n += 1;
  }
  return n;
}
