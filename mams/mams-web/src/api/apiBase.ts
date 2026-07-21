/** Root URL for API calls. Empty → same-origin `/api` (Netlify proxy). */
export function apiRootUrl(): string {
  const fromEnv = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  return fromEnv ? fromEnv.replace(/\/$/, '') : '';
}

export function apiBasePath(): string {
  return `${apiRootUrl()}/api`;
}

/** Default public API host for device webhooks (/iclock); not proxied on Netlify. */
export const PRODUCTION_API_HOST = 'https://maksonpharmahrms-copy-production.up.railway.app';

export function deviceIntegrationRootUrl(): string {
  if (import.meta.env.PROD) {
    const fromEnv = (import.meta.env.VITE_DEVICE_API_BASE_URL as string | undefined)?.trim();
    if (fromEnv) return fromEnv.replace(/\/$/, '');
    const apiRoot = apiRootUrl();
    return apiRoot || PRODUCTION_API_HOST;
  }
  const fromEnv = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return `${window.location.origin.replace(/:\d+$/, ':3001')}`;
}
