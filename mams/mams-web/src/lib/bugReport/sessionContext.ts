const SESSION_KEY = 'mams_session_start';

export function ensureSessionStart(): void {
  if (typeof sessionStorage === 'undefined') return;
  if (!sessionStorage.getItem(SESSION_KEY)) {
    sessionStorage.setItem(SESSION_KEY, String(Date.now()));
  }
}

export function resetSessionStart(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(SESSION_KEY, String(Date.now()));
}

export function getSessionDurationMs(): number {
  if (typeof sessionStorage === 'undefined') return 0;
  const raw = sessionStorage.getItem(SESSION_KEY);
  const start = raw ? Number(raw) : Date.now();
  return Math.max(0, Date.now() - start);
}

export function getViewportLabel(): string {
  if (typeof window === 'undefined') return '0x0';
  return `${window.innerWidth}x${window.innerHeight}`;
}

export function getBrowserOs(): { browser: string; os: string } {
  if (typeof navigator === 'undefined') return { browser: 'unknown', os: 'unknown' };
  const ua = navigator.userAgent;
  let browser = 'unknown';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/')) browser = 'Safari';

  let os = 'unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return { browser, os };
}

const ROUTE_MODULE: Record<string, string> = {
  '/admin': 'Admin · Overview',
  '/admin/users': 'Admin · Users',
  '/admin/organization': 'Admin · Organization',
  '/admin/security': 'Admin · Security',
  '/admin/audit': 'Admin · Audit',
  '/admin/health': 'Admin · System health',
  '/admin/feature-flags': 'Admin · Feature flags',
  '/admin/recycle-bin': 'Admin · Recycle bin',
  '/admin/bug-reporting': 'Admin · Bug reporting',
  '/dashboard': 'Dashboard',
  '/employees': 'Employees',
  '/attendance': 'Attendance',
  '/compliance-attendance': 'Compliance attendance',
  '/reports': 'Reports',
  '/adjustments': 'Adjustments',
  '/leave': 'Leave',
  '/visitors': 'Visitors',
  '/devices': 'Devices',
  '/settings': 'Settings',
  '/employee-change-requests': 'Employee change requests',
  '/compliance-activity': 'Compliance activity',
};

export function moduleFromRoute(pathname: string): string {
  if (ROUTE_MODULE[pathname]) return ROUTE_MODULE[pathname];
  if (pathname.startsWith('/employees/')) return 'Employees · Detail';
  if (pathname.startsWith('/admin/bug-reporting/')) return 'Admin · Bug reporting · Detail';
  if (pathname.startsWith('/admin/')) return 'Admin';
  return pathname || 'Unknown';
}

export function buildBugReportContext(pathname: string, role: string) {
  const { browser, os } = getBrowserOs();
  return {
    route: pathname,
    module: moduleFromRoute(pathname),
    role,
    browser,
    os,
    viewport: getViewportLabel(),
    sessionDurationMs: getSessionDurationMs(),
    appVersion: import.meta.env.VITE_APP_VERSION as string | undefined,
  };
}
