function BarChartEmptyIllustration() {
  return (
    <svg
      width="120"
      height="80"
      viewBox="0 0 120 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="text-text-muted"
    >
      <line x1="12" y1="68" x2="108" y2="68" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
      <line x1="12" y1="68" x2="12" y2="14" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
      <rect x="22" y="48" width="12" height="20" rx="3" fill="currentColor" fillOpacity="0.12" />
      <rect x="40" y="36" width="12" height="32" rx="3" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="3 3" />
      <rect x="58" y="52" width="12" height="16" rx="3" fill="currentColor" fillOpacity="0.12" />
      <rect x="76" y="42" width="12" height="26" rx="3" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="3 3" />
      <rect x="94" y="56" width="12" height="12" rx="3" fill="currentColor" fillOpacity="0.12" />
      <circle cx="60" cy="28" r="14" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1.5" />
      <path
        d="M54 28h12M60 22v12"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DonutChartEmptyIllustration() {
  return (
    <svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="text-text-muted"
    >
      <circle cx="50" cy="50" r="38" stroke="currentColor" strokeOpacity="0.12" strokeWidth="14" />
      <path
        d="M50 12 A38 38 0 0 1 88 50"
        stroke="currentColor"
        strokeOpacity="0.22"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray="6 10"
      />
      <circle cx="50" cy="50" r="22" fill="currentColor" fillOpacity="0.08" />
      <path
        d="M44 50h12M50 44v12"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChartEmptyState({
  title = 'No data available',
  hint,
  variant = 'bar',
}: {
  title?: string;
  hint?: string;
  variant?: 'bar' | 'donut';
}) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center px-6 py-4 h-full w-full"
      role="status"
      aria-label={title}
    >
      {variant === 'bar' ? <BarChartEmptyIllustration /> : <DonutChartEmptyIllustration />}
      <p className="mt-4 text-sm font-semibold text-text">{title}</p>
      {hint ? <p className="mt-1.5 text-xs text-text-muted max-w-[260px] leading-relaxed">{hint}</p> : null}
    </div>
  );
}
