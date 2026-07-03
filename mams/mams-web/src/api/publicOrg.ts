import type { OrgBranding } from '@mams/types';
import { apiBasePath } from './apiBase';

const BASE = apiBasePath();

export type PublicOrgBranding = {
  companyName: string;
  companyLogo: string | null;
  favicon: string | null;
  orgBranding: OrgBranding;
};

async function publicRequest<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`);
  } catch (e) {
    const msg = e instanceof TypeError ? 'Cannot reach the server. Please try again later.' : String(e);
    throw new Error(msg);
  }
  if (!res.ok) {
    let message = res.statusText;
    try {
      const payload = (await res.json()) as { message?: string };
      if (payload?.message) message = payload.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export const publicOrgApi = {
  getBranding: () => publicRequest<PublicOrgBranding>('/public/org'),
};
