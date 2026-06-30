import { InfoTip } from './Tooltip';

export function DashboardStatCard({
  label,
  value,
  sub,
  accent,
  selected,
  onClick,
  hint,
  tooltip,
}: {
  label: string;
  value: string;
  sub: string;
  accent: 'primary' | 'green' | 'red' | 'amber';
  selected: boolean;
  onClick: () => void;
  hint?: string;
  tooltip?: string;
  title?: string;
}) {
  const tip = tooltip ?? hint;

  return (
    <button
      type="button"
      className={`dash-stat-card accent-${accent} text-left w-full ${selected ? 'selected' : ''}`}
      onClick={(e) => {
        onClick();
        (e.currentTarget as HTMLButtonElement).blur();
      }}
    >
      {tip ? <InfoTip content={tip} label={`About ${label}`} /> : null}
      <div className="text-[10px] md:text-[11px] text-text-subtle font-semibold uppercase tracking-wider line-clamp-2 leading-tight pr-5">{label}</div>
      <div className="dash-stat-value text-2xl md:text-3xl font-bold my-1 md:my-1.5 leading-none">{value}</div>
      {sub && <div className="text-[10px] md:text-xs text-text-muted line-clamp-2">{sub}</div>}
    </button>
  );
}
