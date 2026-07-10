/** Returns a safe in-app path for post-login redirect, or null if invalid. */
export function safeReturnPath(pathname?: string | null, search?: string | null): string | null {
  if (!pathname || !pathname.startsWith('/') || pathname.startsWith('//')) return null;
  if (pathname === '/login' || pathname === '/change-password') return null;
  const full = `${pathname}${search ?? ''}`;
  if (full.includes('://') || full.includes('//')) return null;
  return full;
}
