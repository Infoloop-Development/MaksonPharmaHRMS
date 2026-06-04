import { useAuth } from '../store/auth';

/** Empty in dev → same-origin `/api` so Vite proxies to the API (see vite.config.ts). */
const apiRoot = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const BASE = (apiRoot ? apiRoot.replace(/\/$/, '') : '') + '/api';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

async function rawRequest<T>(method: string, path: string, body?: unknown, retried = false): Promise<T> {
  const { accessToken, refreshToken, setAuth, clear } = useAuth.getState();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    const msg =
      e instanceof TypeError
        ? `Cannot reach API (${BASE || '/api'}). Start the server: cd mams && npm run dev:server`
        : String(e);
    throw new ApiError(0, 'network_error', msg);
  }

  if (res.status === 401 && !retried && refreshToken) {
    // Try one refresh + retry.
    let refreshed: Response;
    try {
      refreshed = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch (e) {
      const msg =
        e instanceof TypeError
          ? `Cannot reach API (${BASE || '/api'}). Start the server: cd mams && npm run dev:server`
          : String(e);
      throw new ApiError(0, 'network_error', msg);
    }
    if (refreshed.ok) {
      const data = await refreshed.json();
      setAuth(data);
      return rawRequest<T>(method, path, body, true);
    }
    clear();
  }

  if (!res.ok) {
    let payload: any = null;
    try { payload = await res.json(); } catch { /* ignore */ }
    throw new ApiError(res.status, payload?.error ?? 'http_error', payload?.message ?? res.statusText, payload);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T,>(p: string) => rawRequest<T>('GET', p),
  post: <T,>(p: string, b?: unknown) => rawRequest<T>('POST', p, b),
  patch: <T,>(p: string, b?: unknown) => rawRequest<T>('PATCH', p, b),
  delete: <T,>(p: string) => rawRequest<T>('DELETE', p),
};
