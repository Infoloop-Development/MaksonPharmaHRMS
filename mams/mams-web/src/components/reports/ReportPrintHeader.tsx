import { fmtDate } from '../../lib/format';

export function formatReportDateRange(startDate: string, endDate: string): string {
  if (startDate === endDate) return fmtDate(startDate);
  return `${fmtDate(startDate)} to ${fmtDate(endDate)}`;
}
