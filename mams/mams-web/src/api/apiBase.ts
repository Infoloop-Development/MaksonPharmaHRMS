/** Root URL for API calls. Empty → same-origin `/api` (nginx / Netlify / Vite proxy). */
export function apiRootUrl(): string {
  // Prefer build-time override; otherwise same-origin so on-prem can change host without rebuild.
  const fromEnv = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  return fromEnv ? fromEnv.replace(/\/$/, '') : '';
}

export function apiBasePath(): string {
  return `${apiRootUrl()}/api`;
}

/**
 * Host devices hit for /iclock (and similar).
 * Order: VITE_DEVICE_API_BASE_URL → VITE_API_BASE_URL → current page origin (on-prem / reverse proxy).
 */
export function deviceIntegrationRootUrl(): string {
  const deviceEnv = (import.meta.env.VITE_DEVICE_API_BASE_URL as string | undefined)?.trim();
  if (deviceEnv) return deviceEnv.replace(/\/$/, '');

  const apiEnv = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (apiEnv) return apiEnv.replace(/\/$/, '');

  if (import.meta.env.PROD) {
    return window.location.origin.replace(/\/$/, '');
  }
  return `${window.location.origin.replace(/:\d+$/, ':3001')}`;
}
