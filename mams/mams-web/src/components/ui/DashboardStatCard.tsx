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
      className={`dash-stat-card accent-${accent} text-left w-full h-full ${selected ? 'selected' : ''}`}
      onClick={(e) => {
        onClick();
        (e.currentTarget as HTMLButtonElement).blur();
      }}
    >
      {tip ? <InfoTip content={tip} label={`About ${label}`} /> : null}
      <div className="dash-stat-card-label">{label}</div>
      <div className="dash-stat-value text-2xl md:text-3xl font-bold my-1 md:my-1.5 leading-none">{value}</div>
      <div className="dash-stat-card-sub">{sub || '\u00A0'}</div>
    </button>
  );
}
