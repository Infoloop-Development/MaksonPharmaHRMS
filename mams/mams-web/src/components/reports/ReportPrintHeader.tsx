import { fmtDate } from '../../lib/format';

export function ReportPrintHeader({
  companyName,
  companyLogo,
  title,
  subtitle,
}: {
  companyName: string;
  companyLogo: string | null;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="print-only mb-4 pb-3 border-b border-border">
      <div className="flex items-center gap-3">
        {companyLogo && (
          <img
            src={companyLogo}
            alt="Company logo"
            className="w-12 h-12 object-contain rounded-md border border-border p-0.5 bg-white"
          />
        )}
        <div>
          <div className="text-lg font-bold">{companyName}</div>
          <div className="text-sm font-semibold">{title}</div>
          {subtitle && <div className="text-xs text-text-muted mt-0.5">{subtitle}</div>}
        </div>
      </div>
    </div>
  );
}

export function formatReportDateRange(startDate: string, endDate: string): string {
  if (startDate === endDate) return fmtDate(startDate);
  return `${fmtDate(startDate)} — ${fmtDate(endDate)}`;
}
