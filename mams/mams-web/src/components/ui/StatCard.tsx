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

const ACCENT_BORDER = {
  primary: 'border-l-primary',
  green: 'border-l-green',
  red: 'border-l-red',
  amber: 'border-l-amber',
};

const ACCENT_SELECTED_BG = {
  primary: 'bg-primary-bg',
  green: 'bg-green-bg',
  red: 'bg-red-bg',
  amber: 'bg-amber-bg',
};

export function StatCard({
  label,
  value,
  sub,
  accent = 'primary',
  selected,
  onClick,
  tooltip,
}: StatCardProps) {
  const clickable = onClick !== undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={`card p-3 md:p-5 border-l-4 ${ACCENT_BORDER[accent]} text-left w-full transition relative ${
        clickable ? 'hover:shadow-floating hover:-translate-y-0.5 cursor-pointer' : 'cursor-default'
      } ${selected ? `shadow-floating ${ACCENT_SELECTED_BG[accent]}` : ''}`}
    >
      {tooltip ? <InfoTip content={tooltip} label={`About ${label}`} className="!absolute top-2 right-2.5" /> : null}
      <div className="text-[10px] md:text-[11px] text-text-subtle font-semibold uppercase tracking-wider pr-5">{label}</div>
      <div className="text-2xl md:text-3xl font-bold my-1 md:my-1.5 leading-none">{value}</div>
      {sub && <div className="text-[10px] md:text-xs text-text-muted line-clamp-2">{sub}</div>}
    </button>
  );
}
