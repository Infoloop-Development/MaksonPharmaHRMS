/** Root URL for API calls. Empty → same-origin `/api` (Netlify or Vite proxy). */
export function apiRootUrl(): string {
  // Production builds use the Netlify /api proxy unless VITE_API_BASE_URL is explicitly set.
  if (import.meta.env.PROD) {
    const fromEnv = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
    return fromEnv ? fromEnv.replace(/\/$/, '') : '';
  }
  const fromEnv = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  return fromEnv ? fromEnv.replace(/\/$/, '') : '';
}

export function apiBasePath(): string {
  return `${apiRootUrl()}/api`;
}

/** Render API host for device webhooks (/iclock); not proxied on Netlify. */
export const PRODUCTION_API_HOST = 'https://mams-api-xvso.onrender.com';

export function deviceIntegrationRootUrl(): string {
  if (import.meta.env.PROD) {
    const fromEnv = (import.meta.env.VITE_DEVICE_API_BASE_URL as string | undefined)?.trim();
    return fromEnv ? fromEnv.replace(/\/$/, '') : PRODUCTION_API_HOST;
  }
  const fromEnv = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return `${window.location.origin.replace(/:\d+$/, ':3001')}`;
}
