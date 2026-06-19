import type { FeatureFlagsSummary } from '@mams/types';

const STATS: {
  key: keyof FeatureFlagsSummary;
  label: string;
  accent?: 'primary' | 'green' | 'amber';
}[] = [
  { key: 'total', label: 'Total flags', accent: 'primary' },
  { key: 'enabled', label: 'Enabled', accent: 'green' },
  { key: 'disabled', label: 'Disabled' },
  { key: 'warnings', label: 'Needs attention', accent: 'amber' },
];

export function FeatureFlagsSummary({ summary }: { summary: FeatureFlagsSummary }) {
  return (
    <div className="dash-stat-grid mb-4">
      {STATS.map(({ key, label, accent }) => {
        const value = summary[key];
        const accentClass = accent && (key !== 'warnings' || value > 0) ? `accent-${accent}` : '';
        return (
          <div
            key={key}
            className={`dash-stat-card ${accentClass} !cursor-default pointer-events-none`.trim()}
            aria-label={`${label}: ${value}`}
          >
            <div className="text-[10px] md:text-[11px] text-text-subtle font-semibold uppercase tracking-wider">
              {label}
            </div>
            <div className="dash-stat-value text-2xl md:text-3xl font-bold my-1 md:my-1.5 leading-none">{value}</div>
          </div>
        );
      })}
    </div>
  );
}
