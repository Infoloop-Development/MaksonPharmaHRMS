import { useAuth } from '../store/auth';

const apiRoot = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const BASE = (apiRoot ? apiRoot.replace(/\/$/, '') : '') + '/api';

export interface CsvImportResult {
  totalRows: number;
  successCount: number;
  duplicateCount: number;
  invalidCount: number;
  errors: Array<{ rowIndex: number; empCode: string; reason: string }>;
}

export async function uploadEmployeeCsv(text: string): Promise<CsvImportResult> {
  const token = useAuth.getState().accessToken;
  const res = await fetch(`${BASE}/employees/import-csv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/csv',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: text,
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.message ?? `Import failed (${res.status})`);
  }
  return (await res.json()) as CsvImportResult;
}

/** Authenticated download (plain `<a href>` would omit Bearer and can 401). */
export async function downloadEmployeeCsvTemplate(): Promise<void> {
  const token = useAuth.getState().accessToken;
  const res = await fetch(`${BASE}/employees/import-csv/template`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error((payload as { message?: string }).message ?? `Template download failed (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mams-employee-import-template.csv';
  a.rel = 'noreferrer';
  a.click();
  URL.revokeObjectURL(url);
}
