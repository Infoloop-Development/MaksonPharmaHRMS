import { parseContentDispositionFilename } from '@mams/types';
import { apiBasePath } from '../api/apiBase';
import { useAuth } from '../store/auth';

/** Download an authenticated API export (Excel blob). `apiPath` is e.g. `/reports/daily.xlsx?...`. */
export async function downloadAuthenticatedExport(
  apiPath: string,
  fallbackFilename: string
): Promise<void> {
  const token = useAuth.getState().accessToken;
  const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  const res = await fetch(`${apiBasePath()}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error((payload as { message?: string }).message ?? `Export failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download =
    parseContentDispositionFilename(res.headers.get('Content-Disposition')) ?? fallbackFilename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Download an authenticated POST export (Excel blob with JSON body). */
export async function downloadAuthenticatedExportPost(
  apiPath: string,
  body: unknown,
  fallbackFilename: string
): Promise<void> {
  const token = useAuth.getState().accessToken;
  const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  const res = await fetch(`${apiBasePath()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error((payload as { message?: string }).message ?? `Export failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download =
    parseContentDispositionFilename(res.headers.get('Content-Disposition')) ?? fallbackFilename;
  a.click();
  URL.revokeObjectURL(url);
}
