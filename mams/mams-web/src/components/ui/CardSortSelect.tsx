export interface CardSortOption {
  value: string;
  label: string;
}

export function CardSortSelect({
  value,
  onChange,
  options,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  options: CardSortOption[];
  className?: string;
}) {
  return (
    <select
      className={`input btn-sm w-auto min-w-[140px] ${className}`.trim()}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Sort by"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
