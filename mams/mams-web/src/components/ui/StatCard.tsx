import { InfoTip } from './Tooltip';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'primary' | 'green' | 'red' | 'amber';
  selected?: boolean;
  onClick?: () => void;
  tooltip?: string;
}

export function StatCard({ label, value, sub, accent = 'primary', selected, onClick, tooltip }: StatCardProps) {
  const clickable = onClick !== undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={`dash-stat-card accent-${accent} text-left w-full h-full ${
        clickable ? 'hover:shadow-floating hover:-translate-y-0.5 cursor-pointer' : '!cursor-default'
      } ${selected ? 'selected' : ''}`}
    >
      {tooltip ? <InfoTip content={tooltip} label={`About ${label}`} className="!absolute top-2 right-2.5" /> : null}
      <div className="dash-stat-card-label">{label}</div>
      <div className="dash-stat-value text-2xl md:text-3xl font-bold my-1 md:my-1.5 leading-none">{value}</div>
      <div className="dash-stat-card-sub">{sub || '\u00A0'}</div>
    </button>
  );
}
