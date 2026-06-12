import type { VisitorField, VisitorPublicSubmit } from '@mams/types';

const apiRoot = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const BASE = (apiRoot ? apiRoot.replace(/\/$/, '') : '') + '/api';

export class PublicVisitorError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

async function publicRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    const msg = e instanceof TypeError ? 'Cannot reach the server. Please try again later.' : String(e);
    throw new PublicVisitorError(0, 'network_error', msg);
  }

  if (!res.ok) {
    let payload: { error?: string; message?: string; details?: unknown } | null = null;
    try {
      payload = await res.json();
    } catch {
      /* ignore */
    }
    throw new PublicVisitorError(
      res.status,
      payload?.error ?? 'http_error',
      payload?.message ?? res.statusText,
      payload?.details
    );
  }
  return (await res.json()) as T;
}

export interface PublicVisitorFormSchema {
  title: string;
  description: string | null;
  formVersion: number;
  isActive: boolean;
  fields: VisitorField[];
}

export const publicVisitorApi = {
  getForm: (slug: string) =>
    publicRequest<PublicVisitorFormSchema>('GET', `/public/visitor-forms/${encodeURIComponent(slug)}`),
  submit: (slug: string, body: VisitorPublicSubmit) =>
    publicRequest<{ ok: boolean; message: string }>(
      'POST',
      `/public/visitor-forms/${encodeURIComponent(slug)}/submit`,
      body
    ),
  uploadFile: async (slug: string, fieldId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('fieldId', fieldId);
    return publicRequest<{ storageKey: string; filename: string; size: number; mimeType: string }>(
      'POST',
      `/public/visitor-forms/${encodeURIComponent(slug)}/upload`,
      fd
    );
  },
};
