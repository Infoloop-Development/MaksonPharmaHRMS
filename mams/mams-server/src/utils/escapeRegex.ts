/** Escape user input for safe use inside MongoDB $regex / RegExp. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
