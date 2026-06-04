/**
 * Display helpers. All times displayed in IST.
 */
const IST = 'Asia/Kolkata';

export function fmtIstDate(d: Date | string | null): string {
  if (!d) return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function fmtIstTime(d: Date | string | null): string {
  if (!d) return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date);
}

export function fmtDate(yyyymmdd: string): string {
  // 'YYYY-MM-DD' -> 'DD/MM/YYYY' for Indian display convention.
  if (!yyyymmdd) return '-';
  const [y, m, d] = yyyymmdd.split('-');
  return `${d}/${m}/${y}`;
}

export function fmtNumber(n: number): string {
  return new Intl.NumberFormat('en-IN').format(n);
}

export function fmtHours(h: number): string {
  if (Number.isNaN(h)) return '-';
  return `${h.toFixed(1)} h`;
}
